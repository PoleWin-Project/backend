import { Transaction } from "sequelize";
import {
    PredictionModel,
    PronosticModel,
    PronosticDetailModel,
    ProfileModel,
    RaceSessionModel,
} from "../../database/models";
import { CreatePredictionInput, ListMyPronosticsQuery, UpdatePredictionInput } from "./predictions.dto";

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

    findProfileByUserId(userId: number, tx?: Transaction) {
        return ProfileModel.findOne({ where: { userId }, transaction: tx });
    }

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
