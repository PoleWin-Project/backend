import { Op, QueryTypes, Transaction, UniqueConstraintError } from "sequelize";
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
import { isResultCandidateConfirmed } from "./predictionResultState";
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
    corrected?: boolean;
    pointsDelta?: number;
};

type ResultSource = "openf1_session_result" | "admin";

export type ResolutionResult = {
    resolved: number;
    awaiting: number;
    winningValue: string | null;
    resultStatus: "pending" | "provisional" | "corrected" | "final";
    candidateWinningValue?: string | null;
    corrected?: boolean;
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

    async getCurrentWeekend(userId: number) {
        const rows = await this.repo.findCurrentWeekend(userId);
        if (!rows.length) return null;

        const sessions = rows.map((row: any) => {
            const session = typeof row.toJSON === "function" ? row.toJSON() : row;
            const predictions = (session.predictions ?? [])
                .filter((prediction: any) => !isChampionshipMode() || !prediction.voidedAt)
                .sort((a: any, b: any) => Number(a.id) - Number(b.id))
                .map((prediction: any) => {
                    const pronostic = prediction.pronostics?.[0] ?? null;
                    return {
                        id: prediction.id,
                        sessionId: prediction.sessionId,
                        type: prediction.type,
                        closesAt: prediction.closesAt,
                        winningValue: prediction.winningValue,
                        resultStatus: prediction.resultStatus,
                        rewardOptions: (prediction.rewardOptions ?? []).map((option: any) => ({
                            value: option.optionValue,
                            rewardPoints: option.rewardPoints,
                            partialRewardPoints: option.partialRewardPoints,
                        })),
                        pronostic: pronostic ? {
                            id: pronostic.id,
                            predictionId: pronostic.predictionId,
                            status: pronostic.status,
                            scoringModel: pronostic.scoringModel,
                            rewardPointsSnapshot: pronostic.rewardPointsSnapshot,
                            partialRewardPointsSnapshot: pronostic.partialRewardPointsSnapshot,
                            championshipPointsAwarded: pronostic.championshipPointsAwarded,
                            detail: pronostic.detail
                                ? { value: pronostic.detail.value }
                                : undefined,
                        } : null,
                    };
                });

            return {
                id: session.id,
                idCourseExternal: session.idCourseExternal,
                name: session.name,
                type: session.type,
                location: session.location,
                dateStart: session.dateStart,
                predictions,
            };
        });
        const first = sessions[0];

        return {
            name: first.name.includes(" - ") ? first.name.split(" - ")[0].trim() : first.name,
            location: first.location,
            seasonYear: new Date(first.dateStart).getFullYear(),
            sessions,
        };
    }

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
            await pred.update({ voidedAt: new Date(), resultStatus: "final" }, { transaction: tx });
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
     * Résolution en deux temps :
     * - automatique : `/session_result` doit fournir deux fois la même valeur ;
     * - manuelle : attribution immédiate, et `force=true` permet une correction tracée.
     * Une valeur attribuée reste provisoire pendant la fenêtre de réconciliation.
     */
    async resolve(predictionId: number, input: ResolveInput, actorUserId?: number): Promise<ResolutionResult> {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");
        if (pred.voidedAt) throw httpErrors.unprocessableEntity("This prediction has been cancelled", "PREDICTION_VOIDED");
        if (input.force && !input.winningValue) {
            throw httpErrors.unprocessableEntity("winningValue is required with force", "VALIDATION_ERROR");
        }

        if (input.winningValue) {
            return this.applyManualResult(predictionId, pred.type, input.winningValue, Boolean(input.force), actorUserId);
        }

        const sessionKey = pred.session?.idCourseExternal ?? null;
        if (!sessionKey) {
            throw httpErrors.unprocessableEntity(
                "No winningValue provided and session has no OpenF1 key (idCourseExternal)",
            );
        }

        // Aucun verrou n'est tenu pendant l'appel réseau.
        const officialValue = await autoResolve(pred.type, sessionKey);
        if (!officialValue) {
            const [awaiting] = await PronosticModel.update(
                { status: "awaiting_verification" },
                { where: { predictionId, status: "submitted" } },
            );
            await PredictionModel.update(
                { resultCheckedAt: new Date(), resultSource: "openf1_session_result" },
                { where: { id: predictionId } },
            );
            return {
                resolved: 0,
                awaiting,
                winningValue: pred.winningValue ?? null,
                resultStatus: pred.resultStatus ?? "pending",
            };
        }

        return this.observeOfficialResult(predictionId, pred.type, officialValue);
    }

    private confirmationMs() {
        return env.resultConfirmationMinutes * 60 * 1000;
    }

    private reconciliationUntil(now: Date) {
        return new Date(now.getTime() + env.resultReconciliationHours * 60 * 60 * 1000);
    }

    private async applyManualResult(
        predictionId: number,
        type: string,
        winningValue: string,
        force: boolean,
        actorUserId?: number,
    ) {
        const result = await sequelize.transaction(async (tx) => {
            await this.lockPrediction(predictionId, tx);
            const lockedPred = await PredictionModel.findByPk(predictionId, { transaction: tx, lock: tx.LOCK.UPDATE });
            if (!lockedPred) throw httpErrors.notFound("Prediction not found");
            if (lockedPred.winningValue && lockedPred.winningValue !== winningValue && !force) {
                throw httpErrors.conflict(
                    "Prediction already has a different result; use force to create a traced correction",
                    "RESULT_ALREADY_SET",
                );
            }
            return this.applyConfirmedResultLocked(lockedPred, type, winningValue, "admin", tx, actorUserId);
        });
        this.afterResultCommit(predictionId, result.outcomes, result.winningValue, result.resultStatus);
        return result.response;
    }

    private async observeOfficialResult(predictionId: number, type: string, officialValue: string) {
        const result = await sequelize.transaction(async (tx) => {
            await this.lockPrediction(predictionId, tx);
            const pred = await PredictionModel.findByPk(predictionId, { transaction: tx, lock: tx.LOCK.UPDATE });
            if (!pred) throw httpErrors.notFound("Prediction not found");
            if (pred.voidedAt) throw httpErrors.unprocessableEntity("This prediction has been cancelled", "PREDICTION_VOIDED");

            const now = new Date();
            const status = pred.resultStatus ?? (pred.winningValue ? "final" : "pending");
            if (status === "final") {
                return this.noResultChange(pred, 0);
            }

            // Première attribution : deux observations identiques sont obligatoires.
            if (!pred.winningValue) {
                if (pred.candidateWinningValue !== officialValue || !pred.candidateSeenAt) {
                    await pred.update({
                        candidateWinningValue: officialValue,
                        candidateSeenAt: now,
                        resultCheckedAt: now,
                        resultSource: "openf1_session_result",
                    }, { transaction: tx });
                    const awaiting = await this.markAwaiting(predictionId, tx);
                    return this.noResultChange(pred, awaiting, officialValue);
                }
                if (!isResultCandidateConfirmed(
                    pred.candidateWinningValue,
                    pred.candidateSeenAt,
                    officialValue,
                    now,
                    this.confirmationMs(),
                )) {
                    await pred.update({ resultCheckedAt: now }, { transaction: tx });
                    const awaiting = await this.countAwaiting(predictionId, tx);
                    return this.noResultChange(pred, awaiting, officialValue);
                }
                return this.applyConfirmedResultLocked(pred, type, officialValue, "openf1_session_result", tx);
            }

            // Le fournisseur confirme la valeur courante : on finalise à l'échéance.
            if (pred.winningValue === officialValue) {
                if (pred.reconciliationUntil && now >= pred.reconciliationUntil) {
                    await pred.update({
                        resultStatus: "final",
                        candidateWinningValue: null,
                        candidateSeenAt: null,
                        resultCheckedAt: now,
                        resultSource: "openf1_session_result",
                    }, { transaction: tx });
                    await this.recordResultRevision(pred.id, pred.winningValue, pred.winningValue, "final", "openf1_session_result", now, tx);
                    return this.noResultChange(pred, 0, undefined, "final");
                }
                await pred.update({
                    candidateWinningValue: null,
                    candidateSeenAt: null,
                    resultCheckedAt: now,
                    resultSource: "openf1_session_result",
                }, { transaction: tx });
                return this.noResultChange(pred, 0);
            }

            // Changement officiel : lui aussi doit être stable entre deux observations.
            if (pred.candidateWinningValue !== officialValue || !pred.candidateSeenAt) {
                await pred.update({
                    candidateWinningValue: officialValue,
                    candidateSeenAt: now,
                    resultCheckedAt: now,
                    resultSource: "openf1_session_result",
                }, { transaction: tx });
                return this.noResultChange(pred, 0, officialValue);
            }
            if (!isResultCandidateConfirmed(
                pred.candidateWinningValue,
                pred.candidateSeenAt,
                officialValue,
                now,
                this.confirmationMs(),
            )) {
                await pred.update({ resultCheckedAt: now }, { transaction: tx });
                return this.noResultChange(pred, 0, officialValue);
            }
            return this.applyConfirmedResultLocked(pred, type, officialValue, "openf1_session_result", tx);
        });

        this.afterResultCommit(predictionId, result.outcomes, result.winningValue, result.resultStatus);
        return result.response;
    }

    private noResultChange(
        pred: PredictionModel,
        awaiting: number,
        candidateWinningValue?: string,
        resultStatus?: "pending" | "provisional" | "corrected" | "final",
    ) {
        const status = resultStatus ?? pred.resultStatus ?? (pred.winningValue ? "final" : "pending");
        return {
            outcomes: [] as Outcome[],
            winningValue: pred.winningValue ?? null,
            resultStatus: status,
            response: {
                resolved: 0,
                awaiting,
                winningValue: pred.winningValue ?? null,
                resultStatus: status,
                candidateWinningValue: candidateWinningValue ?? null,
            },
        };
    }

    private markAwaiting(predictionId: number, tx: Transaction) {
        return PronosticModel.update(
            { status: "awaiting_verification" },
            { where: { predictionId, status: "submitted" }, transaction: tx },
        ).then(([changed]) => changed);
    }

    private countAwaiting(predictionId: number, tx: Transaction) {
        return PronosticModel.count({
            where: { predictionId, status: { [Op.in]: [...RESOLVABLE_STATUSES] } },
            transaction: tx,
        });
    }

    private async applyConfirmedResultLocked(
        pred: PredictionModel,
        type: string,
        winningValue: string,
        source: ResultSource,
        tx: Transaction,
        actorUserId?: number,
    ) {
        const now = new Date();
        const previousValue = pred.winningValue;
        const isCorrection = Boolean(previousValue && previousValue !== winningValue);

        // Même résultat rejoué : strictement idempotent.
        if (previousValue === winningValue) return this.noResultChange(pred, 0);

        const resultStatus: "corrected" | "provisional" = isCorrection ? "corrected" : "provisional";
        const revisionId = await this.recordResultRevision(
            pred.id,
            previousValue,
            winningValue,
            resultStatus,
            source,
            now,
            tx,
            actorUserId,
        );

        await pred.update({
            winningValue,
            resultStatus,
            candidateWinningValue: null,
            candidateSeenAt: null,
            resultSource: source,
            resultCheckedAt: now,
            reconciliationUntil: this.reconciliationUntil(now),
            resolvedAt: now,
        }, { transaction: tx });

        const statuses = isCorrection ? ["won", "lost"] : [...RESOLVABLE_STATUSES];
        const pronostics = await this.repo.findPronosticsForResolution(pred.id, statuses, tx);
        const outcomes: Outcome[] = [];
        const affectedScores: Array<{ seasonId: number; userId: number }> = [];

        for (const pronostic of pronostics) {
            if (pronostic.scoringModel === "fixed_reward") {
                const outcome = isCorrection
                    ? await this.correctFixedReward(type, pronostic, winningValue, previousValue!, revisionId, tx, actorUserId)
                    : await this.resolveFixedReward(type, pronostic, winningValue, tx);
                if (outcome) {
                    outcomes.push(outcome);
                    if (isCorrection && pronostic.seasonId) {
                        affectedScores.push({ seasonId: pronostic.seasonId, userId: pronostic.userId });
                    }
                }
            } else if (isChampionshipMode()) {
                this.skipLegacyInChampionship(pronostic);
            } else {
                outcomes.push(await this.resolveLegacy(type, pronostic, winningValue, tx));
            }
        }

        if (affectedScores.length) await this.rebuildSeasonScores(affectedScores, now, tx);

        return {
            outcomes,
            winningValue,
            resultStatus,
            response: {
                resolved: outcomes.length,
                awaiting: 0,
                winningValue,
                resultStatus,
                corrected: isCorrection,
            },
        };
    }

    private async recordResultRevision(
        predictionId: number,
        previousValue: string | null,
        newValue: string,
        state: "provisional" | "corrected" | "final",
        source: ResultSource,
        observedAt: Date,
        tx: Transaction,
        actorUserId?: number,
    ) {
        const rows = await sequelize.query<{ id: string }>(
            `INSERT INTO prediction_result_revisions
                (prediction_id, previous_value, new_value, state, source, created_by, observed_at)
             VALUES (:predictionId, :previousValue, :newValue, :state, :source, :actorUserId, :observedAt)
             RETURNING id`,
            {
                replacements: { predictionId, previousValue, newValue, state, source, actorUserId: actorUserId ?? null, observedAt },
                type: QueryTypes.SELECT,
                transaction: tx,
            },
        );
        return Number(rows[0].id);
    }

    private async correctFixedReward(
        type: string,
        pronostic: PronosticModel,
        winningValue: string,
        previousValue: string,
        revisionId: number,
        tx: Transaction,
        actorUserId?: number,
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
        const previousPoints = pronostic.championshipPointsAwarded ?? 0;
        const nextStatus = correct ? "won" : "lost";
        const delta = points - previousPoints;
        if (pronostic.status === nextStatus && delta === 0) return null;
        if (!pronostic.seasonId) throw new Error(`fixed_reward pronostic ${pronostic.id} has no season_id`);

        await pronostic.update(
            { status: nextStatus, championshipPointsAwarded: points, resolvedAt: new Date() },
            { transaction: tx },
        );
        if (delta !== 0) {
            await sequelize.query(
                `INSERT INTO championship_score_events
                    (season_id, user_id, source_type, source_id, points, reason, created_by)
                 VALUES
                    (:seasonId, :userId, 'admin_correction',
                     nextval('championship_admin_correction_source_id_seq'), :delta, :reason, :actorUserId)`,
                {
                    replacements: {
                        seasonId: pronostic.seasonId,
                        userId: pronostic.userId,
                        delta,
                        actorUserId: actorUserId ?? null,
                        reason: `official_result_revision:${revisionId}:${previousValue}->${winningValue}:pronostic:${pronostic.id}`,
                    },
                    transaction: tx,
                },
            );
        }

        return {
            userId: pronostic.userId,
            pronosticId: pronostic.id,
            value: userValue,
            won: correct,
            pointsAwarded: points,
            pointsDelta: delta,
            corrected: true,
            scoringModel: "fixed_reward",
        };
    }

    private async rebuildSeasonScores(
        pairs: Array<{ seasonId: number; userId: number }>,
        now: Date,
        tx: Transaction,
    ) {
        const unique = Array.from(new Map(pairs.map((p) => [`${p.seasonId}:${p.userId}`, p])).values());
        const seasonIds = unique.map((p) => p.seasonId);
        const userIds = unique.map((p) => p.userId);

        await sequelize.query(
            `WITH affected AS (
                 SELECT * FROM unnest(CAST($1 AS int[]), CAST($2 AS int[])) AS a(season_id, user_id)
             )
             INSERT INTO season_scores (season_id, user_id)
             SELECT season_id, user_id FROM affected
             ON CONFLICT (season_id, user_id) DO NOTHING`,
            { bind: [seasonIds, userIds], transaction: tx },
        );
        await sequelize.query(
            `WITH affected AS (
                 SELECT * FROM unnest(CAST($1 AS int[]), CAST($2 AS int[])) AS a(season_id, user_id)
             )
             UPDATE season_scores ss
                SET points = (SELECT COALESCE(SUM(e.points), 0)::int
                                FROM championship_score_events e
                               WHERE e.season_id = ss.season_id AND e.user_id = ss.user_id),
                    correct_count = (SELECT COUNT(*)::int FROM pronostics p
                                      WHERE p.season_id = ss.season_id AND p.user_id = ss.user_id
                                        AND p.scoring_model = 'fixed_reward' AND p.status = 'won'),
                    resolved_count = (SELECT COUNT(*)::int FROM pronostics p
                                       WHERE p.season_id = ss.season_id AND p.user_id = ss.user_id
                                         AND p.scoring_model = 'fixed_reward' AND p.status IN ('won', 'lost')),
                    last_scored_at = (SELECT MAX(p.resolved_at) FROM pronostics p
                                       WHERE p.season_id = ss.season_id AND p.user_id = ss.user_id
                                         AND p.scoring_model = 'fixed_reward' AND p.status = 'won'),
                    updated_at = $3
               FROM affected a
              WHERE ss.season_id = a.season_id AND ss.user_id = a.user_id`,
            { bind: [seasonIds, userIds, now], transaction: tx },
        );
    }

    private afterResultCommit(
        predictionId: number,
        outcomes: Outcome[],
        winningValue: string | null,
        resultStatus: string,
    ) {
        if (!outcomes.length) return;
        logger.info({
            predictionId,
            winningValue,
            resultStatus,
            resolved: outcomes.length,
            won: outcomes.filter((o) => o.won).length,
            pointsAwarded: outcomes.reduce((sum, o) => sum + o.pointsAwarded, 0),
        }, outcomes.some((o) => o.corrected) ? "Prediction result corrected" : "Prediction resolved provisionally");
        for (const outcome of outcomes) this.notifyOutcome(outcome, predictionId);
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
                ...(o.corrected ? { corrected: true, pointsDelta: o.pointsDelta ?? 0 } : {}),
            });
            void notifyUser(o.userId, {
                title: o.corrected
                    ? "Résultat officiel corrigé"
                    : o.won ? "🏁 Pronostic correct !" : "Résultat disponible",
                body: o.corrected
                    ? o.won
                        ? `${o.value} devient correct : ${o.pointsAwarded} points de championnat.`
                        : `${o.value} n'est plus le résultat officiel. Le classement a été ajusté.`
                    : o.won
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
