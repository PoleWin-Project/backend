import { Op, Transaction } from "sequelize";
import {
    PredictionModel,
    PronosticModel,
    PronosticDetailModel,
    ProfileModel,
    RaceSessionModel,
} from "../../database/models";

/** Statuts d'un pronostic qui attend encore son résultat. */
export const OPEN_PRONOSTIC_STATUSES = ["draft", "submitted", "awaiting_verification"] as const;
/** Statuts traités par une résolution normale (hors re-résolution `force`). */
export const RESOLVABLE_STATUSES = ["submitted", "awaiting_verification"] as const;
import { CreatePredictionInput, ListMyPronosticsQuery, UpdatePredictionInput } from "./predictions.dto";

/**
 * Nombre de pronostics rattachés aux prédictions d'une session. Une session qui en a
 * ne doit pas être supprimée : la cascade effacerait l'historique des joueurs.
 */
export function countPronosticsForSession(sessionId: number) {
    return PronosticModel.count({
        include: [{ model: PredictionModel, as: "prediction", where: { sessionId }, required: true, attributes: [] }],
    });
}

export class PredictionsRepository {

    findAllBySession(sessionId: number) {
        return PredictionModel.findAll({
            where: { sessionId },
            order: [["createdAt", "ASC"]],
        });
    }

    findById(id: number) {
        return PredictionModel.findByPk(id, {
            include: [{ model: RaceSessionModel, as: "session" }],
        });
    }

    create(sessionId: number, data: CreatePredictionInput) {
        return PredictionModel.create({
            sessionId,
            ...data,
            closesAt: data.closesAt ? new Date(data.closesAt) : undefined,
        } as any);
    }

    async update(id: number, patch: UpdatePredictionInput) {
        const pred = await PredictionModel.findByPk(id);
        if (!pred) return null;
        return pred.update({
            ...patch,
            closesAt: patch.closesAt ? new Date(patch.closesAt) : patch.closesAt,
        } as any);
    }

    async delete(id: number) {
        const pred = await PredictionModel.findByPk(id);
        if (!pred) return false;
        await pred.destroy();
        return true;
    }

    /** Nombre de pronostics rattachés : une prédiction qui en a ne doit pas être supprimée. */
    countPronostics(predictionId: number) {
        return PronosticModel.count({ where: { predictionId } });
    }

    findPronosticByUserAndPrediction(userId: number, predictionId: number, tx?: Transaction) {
        return PronosticModel.findOne({
            where: { userId, predictionId },
            include: [{ model: PronosticDetailModel, as: "detail" }],
            transaction: tx,
        });
    }

    findAllPronosticsForPrediction(predictionId: number) {
        return PronosticModel.findAll({
            where: { predictionId },
            include: [{ model: PronosticDetailModel, as: "detail" }],
        });
    }

    /**
     * Pronostics à résoudre, VERROUILLÉS (FOR UPDATE) dans la transaction de résolution.
     * Les détails sont chargés à part : Postgres refuse FOR UPDATE sur le côté
     * nullable d'une jointure externe.
     */
    async findPronosticsForResolution(predictionId: number, statuses: readonly string[], tx: Transaction) {
        const pronostics = await PronosticModel.findAll({
            where: { predictionId, status: { [Op.in]: [...statuses] } },
            order: [["id", "ASC"]],
            lock: tx.LOCK.UPDATE,
            transaction: tx,
        });
        if (!pronostics.length) return pronostics;
        const details = await PronosticDetailModel.findAll({
            where: { pronosticId: { [Op.in]: pronostics.map((p) => p.id) } },
            transaction: tx,
        });
        const byId = new Map(details.map((d) => [d.pronosticId, d]));
        for (const p of pronostics) p.detail = byId.get(p.id);
        return pronostics;
    }

    findMyPronostics(userId: number, query: ListMyPronosticsQuery) {
        const where: any = { userId };
        if (query.status) where.status = query.status;

        return PronosticModel.findAndCountAll({
            where,
            include: [
                { model: PronosticDetailModel, as: "detail" },
                { 
                    model: PredictionModel, 
                    as: "prediction",
                    include: [{ model: RaceSessionModel, as: "session" }]
                },
            ],
            order: [["id", "DESC"]],
            limit: query.limit,
            offset: query.offset,
        });
    }

    findMyPronosticsForSession(userId: number, sessionId: number) {
        return PronosticModel.findAll({
            where: { userId },
            include: [
                { model: PronosticDetailModel, as: "detail" },
                {
                    model: PredictionModel,
                    as: "prediction",
                    where: { sessionId },
                    required: true,
                },
            ],
        });
    }

    /**
     * Profil de l'utilisateur. Avec `lock: true` (dans une transaction), la ligne est
     * verrouillée (SELECT … FOR UPDATE) : indispensable avant tout lire-puis-écrire
     * sur `profiles.points`, sinon deux requêtes parallèles perdent une mise à jour.
     */
    findProfileByUserId(userId: number, tx?: Transaction, lock = false) {
        return ProfileModel.findOne({
            where: { userId },
            transaction: tx,
            ...(lock && tx ? { lock: tx.LOCK.UPDATE } : {}),
        });
    }

    /**
     * Crée un pronostic du modèle championship : AUCUNE mise (points_staked = 0),
     * récompense snapshotée au moment de la validation.
     */
    async createFixedRewardPronostic(
        params: {
            userId: number;
            predictionId: number;
            seasonId: number;
            value: string;
            rewardPoints: number;
            partialRewardPoints: number | null;
            ruleVersion: string;
        },
        tx: Transaction,
    ) {
        const pronostic = await PronosticModel.create(
            {
                userId: params.userId,
                predictionId: params.predictionId,
                pointsStaked: 0,
                status: "submitted",
                scoringModel: "fixed_reward",
                seasonId: params.seasonId,
                rewardPointsSnapshot: params.rewardPoints,
                partialRewardPointsSnapshot: params.partialRewardPoints,
                rewardRuleVersion: params.ruleVersion,
                submittedAt: new Date(),
            },
            { transaction: tx },
        );
        await PronosticDetailModel.create(
            { pronosticId: pronostic.id, value: params.value, multiplier: null },
            { transaction: tx },
        );
        return pronostic;
    }

    /** [MODÈLE LEGACY] Pari avec mise et multiplicateur — conservé pendant la compatibilité. */
    async createPronosticWithDetail(
        userId: number,
        predictionId: number,
        pointsStaked: number,
        value: string,
        multiplier: number,
        tx: Transaction,
    ) {
        const pronostic = await PronosticModel.create(
            { userId, predictionId, pointsStaked, status: "submitted" } as any,
            { transaction: tx },
        );
        await PronosticDetailModel.create(
            { pronosticId: pronostic.id, value, multiplier } as any,
            { transaction: tx },
        );
        return pronostic;
    }
}
