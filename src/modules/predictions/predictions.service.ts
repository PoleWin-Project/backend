import { Op, Transaction, UniqueConstraintError } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { httpErrors } from "../../common/errors/http";
import { env, isChampionshipMode } from "../../config/env";
import { logger } from "../../config/logger";
import { PredictionModel, PronosticModel } from "../../database/models";
import {
    OPEN_PRONOSTIC_STATUSES,
    PredictionsRepository,
    RESOLVABLE_STATUSES,
} from "./predictions.repository";
import {
    CreatePredictionInput,
    ListMyPronosticsQuery,
    PlacePronosticInput,
    ResolveInput,
    UpdatePredictionInput,
    UpdatePronosticInput,
} from "./predictions.dto";
import { autoResolve, isWinnerForType } from "./predictions.autoresolve";
import { notifyUser } from "../push/push.service";
import { emitToUser } from "../../socket/ws.handler";
import { seasonsService } from "../seasons/seasons.service";
import { championshipService } from "../championship/championship.service";
import { rewardOptionsService } from "../championship/rewardOptions.service";
import {
    computeAwardedPoints,
    normalizePronosticValue,
    pickReward,
    REWARD_RULE_VERSION,
} from "../championship/rewardScale";

/**
 * Espace de noms des verrous consultatifs Postgres (pg_advisory_xact_lock) utilisés
 * pour sérialiser la résolution d'une même prédiction entre le scheduler, la route
 * admin et plusieurs instances Render.
 */
const RESOLVE_LOCK_NAMESPACE = 41_001;

type Outcome = {
    userId: number;
    pronosticId: number;
    value: string;
    won: boolean;
    /** Modèle championship : points de championnat attribués (0 si incorrect). */
    pointsAwarded: number;
    /** Modèle legacy uniquement. */
    pointsEarned?: number;
    pointsStaked?: number;
    scoringModel: "legacy_stake" | "fixed_reward";
};

/**
 * Pronostics.
 *
 * Deux modèles coexistent pendant la migration, sélectionnés par SCORING_MODEL :
 *  - legacy       : ancien pari (mise débitée sur profiles.points, gain = mise × multiplicateur).
 *                   Conservé pour pouvoir revenir en arrière ; verrous ajoutés.
 *  - championship : pronostic GRATUIT. Aucun montant reçu du client, aucun débit,
 *                   récompense fixe calculée par le serveur et figée à la validation,
 *                   points de championnat attribués uniquement si correct.
 */
export class PredictionsService {
    constructor(private readonly repo = new PredictionsRepository()) {}

    // ── Lecture ──────────────────────────────────────────────────────────────

    async getBySession(sessionId: number) {
        const predictions = await this.repo.findAllBySession(sessionId);
        if (!isChampionshipMode()) return predictions;

        // Mode championship : on expose le barème « N points si correct » de chaque
        // prédiction (généré à la première lecture puis figé) et on masque les annulées.
        const visible = predictions.filter((p) => !p.voidedAt);
        return Promise.all(visible.map((p) => this.withRewardOptions(p)));
    }

    async getById(predictionId: number) {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");
        return isChampionshipMode() ? this.withRewardOptions(pred) : pred;
    }

    /** Sérialise une prédiction avec ses récompenses (jamais présentées comme des cotes). */
    private async withRewardOptions(pred: PredictionModel) {
        const options = await rewardOptionsService.ensureForPrediction(pred);
        return {
            ...pred.toJSON(),
            rewardOptions: options.map((o) => ({
                value: o.optionValue,
                rewardPoints: o.rewardPoints,
                partialRewardPoints: o.partialRewardPoints,
            })),
        };
    }

    // ── Admin : prédictions ──────────────────────────────────────────────────

    create(sessionId: number, data: CreatePredictionInput) {
        return this.repo.create(sessionId, data);
    }

    async update(predictionId: number, patch: UpdatePredictionInput) {
        const pred = await this.repo.update(predictionId, patch);
        if (!pred) throw httpErrors.notFound("Prediction not found");
        return pred;
    }

    /**
     * Suppression physique d'une prédiction. Interdite dès qu'elle a des pronostics :
     * la FK ON DELETE CASCADE effacerait silencieusement l'historique (et, en legacy,
     * les mises sans remboursement). Utiliser `voidPrediction` à la place.
     */
    async delete(predictionId: number) {
        const count = await this.repo.countPronostics(predictionId);
        if (count > 0) {
            throw httpErrors.conflict(
                `Prediction has ${count} pronostic(s): void it instead of deleting it`,
                "PREDICTION_HAS_PRONOSTICS",
            );
        }
        const deleted = await this.repo.delete(predictionId);
        if (!deleted) throw httpErrors.notFound("Prediction not found");
    }

    /**
     * Annule une prédiction (ex. course annulée) sans rien supprimer :
     *  - pronostics ouverts → statut `void` ;
     *  - legacy : la mise est remboursée ; championship : rien à rembourser (aucune mise).
     */
    async voidPrediction(predictionId: number) {
        return sequelize.transaction(async (tx) => {
            await this.lockPrediction(predictionId, tx);
            const pred = await PredictionModel.findByPk(predictionId, { transaction: tx, lock: tx.LOCK.UPDATE });
            if (!pred) throw httpErrors.notFound("Prediction not found");
            if (pred.resolvedAt || pred.winningValue) {
                throw httpErrors.conflict("Prediction already resolved", "PREDICTION_ALREADY_RESOLVED");
            }

            const open = await this.repo.findPronosticsForResolution(predictionId, OPEN_PRONOSTIC_STATUSES, tx);
            let refunded = 0;
            for (const p of open) {
                if (p.scoringModel === "legacy_stake" && p.pointsStaked > 0) {
                    const profile = await this.repo.findProfileByUserId(p.userId, tx, true);
                    if (profile) {
                        await profile.update({ points: profile.points + p.pointsStaked }, { transaction: tx });
                        refunded += p.pointsStaked;
                    }
                }
                await p.update({ status: "void", resolvedAt: new Date() }, { transaction: tx });
            }
            await pred.update({ voidedAt: new Date() }, { transaction: tx });
            logger.info({ predictionId, voided: open.length, refunded }, "Prediction voided");
            return { voided: open.length, refundedLegacyPoints: refunded };
        });
    }

    // ── Utilisateur : pronostics ─────────────────────────────────────────────

    /** Pendant la fenêtre de bascule, plus aucune écriture de pronostic n'est acceptée. */
    private assertWritable() {
        if (env.predictionsFrozen) {
            throw httpErrors.serviceUnavailable(
                "Les pronostics sont momentanément indisponibles (maintenance).",
                "PREDICTIONS_FROZEN",
            );
        }
    }

    private async getOpenPrediction(predictionId: number, closedMessage = "This prediction is closed") {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");
        if (pred.voidedAt) throw httpErrors.unprocessableEntity("This prediction has been cancelled", "PREDICTION_VOIDED");
        if (pred.closesAt && new Date() > pred.closesAt) {
            throw httpErrors.unprocessableEntity(closedMessage);
        }
        return pred;
    }

    /**
     * Mode championship : refuse ou ignore une mise envoyée par un ancien client.
     * Dans tous les cas la mise n'est JAMAIS utilisée.
     */
    private rejectStakeFromLegacyClient(pointsStaked: number | undefined) {
        if (pointsStaked !== undefined && env.legacyClientPolicy === "reject") {
            throw httpErrors.upgradeRequired(
                "Cette version de l'application n'est plus supportée. Mets-la à jour.",
                "STAKE_NOT_SUPPORTED",
            );
        }
    }

    async placePronostic(userId: number, predictionId: number, input: PlacePronosticInput) {
        this.assertWritable();
        const pred = await this.getOpenPrediction(predictionId);
        return isChampionshipMode()
            ? this.placeChampionship(userId, pred, input)
            : this.placeLegacy(userId, pred, input);
    }

    /**
     * Modèle championship : valide le choix, calcule la récompense CÔTÉ SERVEUR et la
     * fige dans le pronostic. Aucune lecture ni écriture de solde.
     */
    private async placeChampionship(userId: number, pred: PredictionModel, input: PlacePronosticInput) {
        this.rejectStakeFromLegacyClient(input.pointsStaked);

        const season = await seasonsService.getActiveSeason();
        if (!season) {
            throw httpErrors.serviceUnavailable("Aucune saison de championnat active", "NO_ACTIVE_SEASON");
        }

        const { value, reward, ruleVersion } = await this.computeReward(pred, input.value);

        try {
            return await sequelize.transaction(async (tx) => {
                const existing = await this.repo.findPronosticByUserAndPrediction(userId, pred.id, tx);
                if (existing) throw httpErrors.conflict("You already have a pronostic for this prediction");

                await this.repo.createFixedRewardPronostic(
                    {
                        userId,
                        predictionId: pred.id,
                        seasonId: season.id,
                        value,
                        rewardPoints: reward.rewardPoints,
                        partialRewardPoints: reward.partialRewardPoints,
                        ruleVersion,
                    },
                    tx,
                );
                return this.repo.findPronosticByUserAndPrediction(userId, pred.id, tx);
            });
        } catch (e) {
            // Deux requêtes simultanées : l'index unique (user_id, prediction_id) tranche.
            if (e instanceof UniqueConstraintError) {
                throw httpErrors.conflict("You already have a pronostic for this prediction");
            }
            throw e;
        }
    }

    /** Valide la valeur et retourne la récompense applicable (barème figé de la prédiction). */
    private async computeReward(pred: PredictionModel, rawValue: string) {
        const value = normalizePronosticValue(pred.type, rawValue);
        if (!value) throw httpErrors.unprocessableEntity("Invalid value for this prediction", "INVALID_PRONOSTIC_VALUE");

        const options = await rewardOptionsService.ensureForPrediction(pred);
        const reward = pickReward(pred.type, value, options);
        if (!reward) throw httpErrors.unprocessableEntity("No reward defined for this choice", "NO_REWARD_OPTION");

        return { value, reward, ruleVersion: options[0]?.ruleVersion ?? REWARD_RULE_VERSION };
    }

    /** [MODÈLE LEGACY] Pari avec mise débitée. */
    private async placeLegacy(userId: number, pred: PredictionModel, input: PlacePronosticInput) {
        if (input.pointsStaked === undefined) {
            throw httpErrors.unprocessableEntity("pointsStaked is required", "VALIDATION_ERROR");
        }
        const stake = input.pointsStaked;

        return sequelize.transaction(async (tx) => {
            // Profil verrouillé AVANT de vérifier le solde (évite le découvert en concurrence).
            const profile = await this.repo.findProfileByUserId(userId, tx, true);
            const existing = await this.repo.findPronosticByUserAndPrediction(userId, pred.id, tx);

            if (existing) throw httpErrors.conflict("You already have a pronostic for this prediction");
            if (!profile) throw httpErrors.unprocessableEntity("Profile not found");
            if (profile.points < stake) {
                throw httpErrors.unprocessableEntity(
                    `Not enough points (have ${profile.points}, need ${stake})`,
                );
            }

            await profile.update({ points: profile.points - stake }, { transaction: tx });

            // Le multiplicateur n'a jamais été persisté sur la prédiction : toujours ×2.
            const multiplier = 2;
            const pronostic = await this.repo.createPronosticWithDetail(
                userId,
                pred.id,
                stake,
                input.value,
                multiplier,
                tx,
            );

            return this.repo.findPronosticByUserAndPrediction(userId, pronostic.predictionId, tx);
        });
    }

    async updatePronostic(userId: number, predictionId: number, input: UpdatePronosticInput) {
        this.assertWritable();
        const pred = await this.getOpenPrediction(predictionId);
        return isChampionshipMode()
            ? this.updateChampionship(userId, pred, input)
            : this.updateLegacy(userId, pred, input);
    }

    /**
     * Modèle championship : seul le choix peut changer. La récompense est re-snapshotée
     * au barème (figé) de la prédiction pour la nouvelle valeur.
     */
    private async updateChampionship(userId: number, pred: PredictionModel, input: UpdatePronosticInput) {
        this.rejectStakeFromLegacyClient(input.pointsStaked);
        if (input.value === undefined) {
            throw httpErrors.unprocessableEntity("value is required", "VALIDATION_ERROR");
        }
        const { value, reward, ruleVersion } = await this.computeReward(pred, input.value);

        return sequelize.transaction(async (tx) => {
            const existing = await this.repo.findPronosticByUserAndPrediction(userId, pred.id, tx);
            if (!existing) throw httpErrors.notFound("Pronostic not found");
            if (existing.scoringModel !== "fixed_reward") {
                // Ancien pari de la Saison Bêta encore ouvert : il doit avoir été traité
                // par le script de bascule, on refuse de le transformer ici.
                throw httpErrors.conflict("Legacy pronostic cannot be modified", "LEGACY_PRONOSTIC");
            }
            if (existing.status !== "submitted") {
                throw httpErrors.conflict("Pronostic can no longer be modified", "PRONOSTIC_NOT_EDITABLE");
            }

            await existing.update(
                {
                    rewardPointsSnapshot: reward.rewardPoints,
                    partialRewardPointsSnapshot: reward.partialRewardPoints,
                    rewardRuleVersion: ruleVersion,
                    submittedAt: new Date(),
                },
                { transaction: tx },
            );
            if (existing.detail) await existing.detail.update({ value }, { transaction: tx });

            return this.repo.findPronosticByUserAndPrediction(userId, pred.id, tx);
        });
    }

    /** [MODÈLE LEGACY] Modification de la mise et/ou du choix. */
    private async updateLegacy(userId: number, pred: PredictionModel, input: UpdatePronosticInput) {
        return sequelize.transaction(async (tx) => {
            const profile = await this.repo.findProfileByUserId(userId, tx, true);
            const existing = await this.repo.findPronosticByUserAndPrediction(userId, pred.id, tx);

            if (!existing) throw httpErrors.notFound("Pronostic not found");
            if (!profile)  throw httpErrors.unprocessableEntity("Profile not found");

            const newStake = input.pointsStaked ?? existing.pointsStaked;
            const diff = newStake - existing.pointsStaked;

            if (diff > 0 && profile.points < diff) {
                throw httpErrors.unprocessableEntity(
                    `Not enough points (need ${diff} more, have ${profile.points})`,
                );
            }

            if (diff !== 0) {
                await profile.update({ points: profile.points - diff }, { transaction: tx });
                await existing.update({ pointsStaked: newStake }, { transaction: tx });
            }

            if (input.value && existing.detail) {
                await existing.detail.update({ value: input.value }, { transaction: tx });
            }

            return this.repo.findPronosticByUserAndPrediction(userId, pred.id, tx);
        });
    }

    async cancelPronostic(userId: number, predictionId: number) {
        this.assertWritable();
        await this.getOpenPrediction(predictionId, "Cannot cancel after prediction closes");

        return sequelize.transaction(async (tx) => {
            const profile = await this.repo.findProfileByUserId(userId, tx, true);
            const pronostic = await this.repo.findPronosticByUserAndPrediction(userId, predictionId, tx);

            if (!pronostic) throw httpErrors.notFound("Pronostic not found");
            if (!(OPEN_PRONOSTIC_STATUSES as readonly string[]).includes(pronostic.status)) {
                throw httpErrors.conflict("Pronostic can no longer be cancelled", "PRONOSTIC_NOT_EDITABLE");
            }

            // Seuls les anciens paris ont une mise à rembourser. Un pronostic
            // championship n'a rien engagé : on le retire simplement.
            if (pronostic.scoringModel === "legacy_stake" && pronostic.pointsStaked > 0 && profile) {
                await profile.update(
                    { points: (profile.points ?? 0) + pronostic.pointsStaked },
                    { transaction: tx },
                );
            }
            await pronostic.detail?.destroy({ transaction: tx });
            await pronostic.destroy({ transaction: tx });
        });
    }

    getMyPronostic(userId: number, predictionId: number) {
        return this.repo.findPronosticByUserAndPrediction(userId, predictionId);
    }

    async listMyPronostics(userId: number, query: ListMyPronosticsQuery) {
        const { rows, count } = await this.repo.findMyPronostics(userId, query);
        return { items: rows, total: count, limit: query.limit, offset: query.offset };
    }

    getMyPronosticsForSession(userId: number, sessionId: number) {
        return this.repo.findMyPronosticsForSession(userId, sessionId);
    }

    getAllPronosticsForPrediction(predictionId: number) {
        return this.repo.findAllPronosticsForPrediction(predictionId);
    }

    // ── Résolution ───────────────────────────────────────────────────────────

    /** Verrou exclusif (durée de la transaction) sur la résolution d'une prédiction. */
    private async lockPrediction(predictionId: number, tx: Transaction) {
        await sequelize.query("SELECT pg_advisory_xact_lock(:ns, :id)", {
            replacements: { ns: RESOLVE_LOCK_NAMESPACE, id: predictionId },
            transaction: tx,
        });
    }

    /**
     * Résout une prédiction. IDEMPOTENT : peut être appelée plusieurs fois, en parallèle
     * (scheduler + admin + plusieurs instances), sans jamais attribuer deux fois des points :
     *  1. verrou consultatif par prédiction ;
     *  2. pronostics rechargés et verrouillés DANS la transaction ;
     *  3. changement de statut conditionnel (seuls les pronostics encore ouverts sont traités) ;
     *  4. contrainte UNIQUE sur l'événement de score (modèle championship).
     */
    async resolve(predictionId: number, input: ResolveInput) {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");
        if (pred.voidedAt) throw httpErrors.unprocessableEntity("This prediction has been cancelled", "PREDICTION_VOIDED");

        const championship = isChampionshipMode();
        if (championship && input.force) {
            throw httpErrors.unprocessableEntity(
                "force re-resolution is not available in championship mode (use a traced admin correction)",
                "FORCE_NOT_SUPPORTED",
            );
        }

        const statuses = input.force
            ? [...RESOLVABLE_STATUSES, "won", "lost"]
            : [...RESOLVABLE_STATUSES];

        // 1. Résultat : saisie manuelle → OpenF1 → sinon en attente.
        //    L'appel réseau est fait AVANT d'ouvrir la transaction (pas de verrou tenu pendant I/O).
        let winningValue: string | null = input.winningValue ?? null;
        if (!winningValue) {
            const sessionKey = pred.session?.idCourseExternal ?? null;
            if (!sessionKey) {
                throw httpErrors.unprocessableEntity(
                    "No winningValue provided and session has no OpenF1 key (idCourseExternal)",
                );
            }
            winningValue = await autoResolve(pred.type, sessionKey);
        }

        // 2. Résultat indisponible → pronostics « en attente de vérification ».
        if (!winningValue) {
            const [awaiting] = await PronosticModel.update(
                { status: "awaiting_verification" },
                { where: { predictionId, status: "submitted" } },
            );
            return { resolved: 0, awaiting, winningValue: null };
        }

        const resolvedValue = winningValue;
        const outcomes: Outcome[] = [];

        // 3. Attribution, entièrement transactionnelle.
        await sequelize.transaction(async (tx) => {
            await this.lockPrediction(predictionId, tx);
            const lockedPred = await PredictionModel.findByPk(predictionId, { transaction: tx, lock: tx.LOCK.UPDATE });
            if (!lockedPred) throw httpErrors.notFound("Prediction not found");
            await lockedPred.update({ winningValue: resolvedValue, resolvedAt: new Date() }, { transaction: tx });

            const pronostics = await this.repo.findPronosticsForResolution(predictionId, statuses, tx);
            for (const pronostic of pronostics) {
                const outcome = pronostic.scoringModel === "fixed_reward"
                    ? await this.resolveFixedReward(pred.type, pronostic, resolvedValue, tx)
                    : championship
                        ? this.skipLegacyInChampionship(pronostic)
                        : await this.resolveLegacy(pred.type, pronostic, resolvedValue, tx);
                if (outcome) outcomes.push(outcome);
            }
        });

        logger.info(
            {
                predictionId,
                winningValue: resolvedValue,
                resolved: outcomes.length,
                won: outcomes.filter((o) => o.won).length,
                pointsAwarded: outcomes.reduce((s, o) => s + o.pointsAwarded, 0),
            },
            "Prediction resolved",
        );

        // 4. Notifications (après COMMIT, best-effort).
        for (const o of outcomes) this.notifyOutcome(o, predictionId);

        return { resolved: outcomes.length, awaiting: 0, winningValue: resolvedValue };
    }

    /**
     * Modèle championship : correct → +récompense snapshotée ; incorrect → 0, rien n'est retiré.
     * Le passage de statut est CONDITIONNEL : si le pronostic n'est plus ouvert (déjà
     * résolu par un autre processus), on ne fait rien.
     */
    private async resolveFixedReward(
        type: string,
        pronostic: PronosticModel,
        winningValue: string,
        tx: Transaction,
    ): Promise<Outcome | null> {
        const userValue = pronostic.detail?.value ?? "";
        const { correct, points } = userValue
            ? computeAwardedPoints(
                type,
                userValue,
                winningValue,
                {
                    rewardPoints: pronostic.rewardPointsSnapshot ?? 0,
                    partialRewardPoints: pronostic.partialRewardPointsSnapshot ?? null,
                },
                (u, w) => isWinnerForType(type as any, u, w),
            )
            : { correct: false, points: 0 };

        const [changed] = await PronosticModel.update(
            { status: correct ? "won" : "lost", championshipPointsAwarded: points, resolvedAt: new Date() },
            {
                where: { id: pronostic.id, status: { [Op.in]: [...RESOLVABLE_STATUSES] } },
                transaction: tx,
            },
        );
        if (changed !== 1) return null;

        if (!pronostic.seasonId) {
            // Ne devrait jamais arriver (season_id renseigné à la validation).
            throw new Error(`fixed_reward pronostic ${pronostic.id} has no season_id`);
        }
        await championshipService.recordPronosticResult(tx, {
            seasonId: pronostic.seasonId,
            userId: pronostic.userId,
            pronosticId: pronostic.id,
            points,
        });

        return {
            userId: pronostic.userId,
            pronosticId: pronostic.id,
            value: userValue,
            won: correct,
            pointsAwarded: points,
            scoringModel: "fixed_reward",
        };
    }

    /**
     * Un ancien pari encore ouvert alors que le mode championship est actif : il aurait dû
     * être traité par le script de bascule. On ne le touche pas (pas de gain de mise).
     */
    private skipLegacyInChampionship(pronostic: PronosticModel): null {
        logger.warn(
            { pronosticId: pronostic.id, status: pronostic.status },
            "Legacy stake pronostic still open in championship mode — left untouched (run the cutover script)",
        );
        return null;
    }

    /** [MODÈLE LEGACY] Crédit de mise × multiplicateur sur profiles.points. */
    private async resolveLegacy(
        type: string,
        pronostic: PronosticModel,
        winningValue: string,
        tx: Transaction,
    ): Promise<Outcome> {
        // Re-résolution `force` : annuler d'abord les gains déjà crédités (sinon double compte).
        if (pronostic.status === "won" && (pronostic.pointsEarned ?? 0) > 0) {
            const prevProfile = await this.repo.findProfileByUserId(pronostic.userId, tx, true);
            if (prevProfile) {
                await prevProfile.update(
                    { points: prevProfile.points - (pronostic.pointsEarned ?? 0) },
                    { transaction: tx },
                );
            }
        }

        const userValue = pronostic.detail?.value ?? "";
        let isWinner = false;
        let multiplier = pronostic.detail?.multiplier ?? 2;

        if (type === "PODIUM") {
            const winningArr = winningValue.split(",");
            const userArr = userValue.split(",");
            const hasSameDrivers = winningArr.length === 3 && userArr.length === 3 && winningArr.every((d) => userArr.includes(d));
            if (userValue === winningValue) {
                isWinner = true;
                multiplier = 4;
            } else if (hasSameDrivers) {
                isWinner = true;
            }
        } else {
            isWinner = userValue ? isWinnerForType(type as any, userValue, winningValue) : false;
        }

        const pointsEarned = isWinner ? Math.floor(pronostic.pointsStaked * multiplier) : 0;
        await pronostic.update({ status: isWinner ? "won" : "lost", pointsEarned, resolvedAt: new Date() }, { transaction: tx });

        if (isWinner) {
            const profile = await this.repo.findProfileByUserId(pronostic.userId, tx, true);
            if (profile) {
                await profile.update({ points: profile.points + pointsEarned }, { transaction: tx });
            }
        }

        return {
            userId: pronostic.userId,
            pronosticId: pronostic.id,
            value: userValue,
            won: isWinner,
            pointsAwarded: 0,
            pointsEarned,
            pointsStaked: pronostic.pointsStaked,
            scoringModel: "legacy_stake",
        };
    }

    /** Notifications temps réel + push, sans aucun vocabulaire de pari en mode championship. */
    private notifyOutcome(o: Outcome, predictionId: number) {
        if (o.scoringModel === "fixed_reward") {
            emitToUser(o.userId, "prono:resolved", {
                pronosticId: o.pronosticId,
                predictionId,
                status: o.won ? "won" : "lost",
                value: o.value,
                pointsAwarded: o.pointsAwarded,
            });
            void notifyUser(o.userId, {
                title: o.won ? "🏁 Pronostic correct !" : "Résultat disponible",
                body: o.won
                    ? `${o.value} : +${o.pointsAwarded} points de championnat !`
                    : `${o.value} : pas de points cette fois. Rendez-vous au prochain Grand Prix !`,
                data: { type: "prono", predictionId },
            });
            return;
        }

        // [MODÈLE LEGACY] — messages historiques, supprimés avec le modèle legacy.
        emitToUser(o.userId, "prono:resolved", {
            pronosticId: o.pronosticId,
            predictionId,
            status: o.won ? "won" : "lost",
            value: o.value,
            pointsEarned: o.pointsEarned,
            pointsStaked: o.pointsStaked,
        });
        void notifyUser(o.userId, {
            title: o.won ? "🏁 Prono gagné !" : "Prono terminé",
            body: o.won
                ? `${o.value} : +${o.pointsEarned} pts remportés !`
                : `${o.value} : pas cette fois (-${o.pointsStaked} pts).`,
            data: { type: "prono", predictionId },
        });
    }
}
