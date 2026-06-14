import { sequelize } from "../../database/sequelize";
import { httpErrors } from "../../common/errors/http";
import { PredictionsRepository } from "./predictions.repository";
import {
    CreatePredictionInput,
    ListMyPronosticsQuery,
    PlacePronosticInput,
    ResolveInput,
    UpdatePredictionInput,
    UpdatePronosticInput,
} from "./predictions.dto";
import { autoResolve, isWinnerForType } from "./predictions.autoresolve";

export class PredictionsService {
    constructor(private readonly repo = new PredictionsRepository()) {}

    getBySession(sessionId: number) {
        return this.repo.findAllBySession(sessionId);
    }

    async getById(predictionId: number) {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");
        return pred;
    }

    create(sessionId: number, data: CreatePredictionInput) {
        return this.repo.create(sessionId, data);
    }

    async update(predictionId: number, patch: UpdatePredictionInput) {
        const pred = await this.repo.update(predictionId, patch);
        if (!pred) throw httpErrors.notFound("Prediction not found");
        return pred;
    }

    async delete(predictionId: number) {
        const deleted = await this.repo.delete(predictionId);
        if (!deleted) throw httpErrors.notFound("Prediction not found");
    }

    async placePronostic(userId: number, predictionId: number, input: PlacePronosticInput) {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");

        if (pred.closesAt && new Date() > pred.closesAt) {
            throw httpErrors.unprocessableEntity("This prediction is closed");
        }

        return sequelize.transaction(async (tx) => {
            const [existing, profile] = await Promise.all([
                this.repo.findPronosticByUserAndPrediction(userId, predictionId, tx),
                this.repo.findProfileByUserId(userId, tx),
            ]);

            if (existing) throw httpErrors.conflict("You already have a pronostic for this prediction");
            if (!profile) throw httpErrors.unprocessableEntity("Profile not found");
            if (profile.points < input.pointsStaked) {
                throw httpErrors.unprocessableEntity(
                    `Not enough points (have ${profile.points}, need ${input.pointsStaked})`,
                );
            }

            await profile.update({ points: profile.points - input.pointsStaked }, { transaction: tx });

            const multiplier = (pred as any).defaultMultiplier ?? 2;
            const pronostic = await this.repo.createPronosticWithDetail(
                userId,
                predictionId,
                input.pointsStaked,
                input.value,
                multiplier,
                tx,
            );

            return this.repo.findPronosticByUserAndPrediction(userId, pronostic.predictionId, tx);
        });
    }

    async updatePronostic(userId: number, predictionId: number, input: UpdatePronosticInput) {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");

        if (pred.closesAt && new Date() > pred.closesAt) {
            throw httpErrors.unprocessableEntity("This prediction is closed");
        }

        return sequelize.transaction(async (tx) => {
            const [existing, profile] = await Promise.all([
                this.repo.findPronosticByUserAndPrediction(userId, predictionId, tx),
                this.repo.findProfileByUserId(userId, tx),
            ]);

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

            return this.repo.findPronosticByUserAndPrediction(userId, predictionId, tx);
        });
    }

    async cancelPronostic(userId: number, predictionId: number) {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");

        if (pred.closesAt && new Date() > pred.closesAt) {
            throw httpErrors.unprocessableEntity("Cannot cancel after prediction closes");
        }

        return sequelize.transaction(async (tx) => {
            const [pronostic, profile] = await Promise.all([
                this.repo.findPronosticByUserAndPrediction(userId, predictionId, tx),
                this.repo.findProfileByUserId(userId, tx),
            ]);

            if (!pronostic) throw httpErrors.notFound("Pronostic not found");

            await profile?.update(
                { points: (profile.points ?? 0) + pronostic.pointsStaked },
                { transaction: tx },
            );
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

    async resolve(predictionId: number, input: ResolveInput) {
        const pred = await this.repo.findById(predictionId);
        if (!pred) throw httpErrors.notFound("Prediction not found");

        const pronostics = await this.repo.findAllPronosticsForPrediction(predictionId);
        // Include previously unresolved pronostics on retry
        const toResolve = pronostics.filter(
            (p) => p.status === "submitted" || p.status === "awaiting_verification",
        );

        // 1. Determine winning value: manual override → auto-resolve → awaiting
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

        // 2. Can't determine answer → mark as awaiting admin verification
        if (!winningValue) {
            await sequelize.transaction(async (tx) => {
                for (const pronostic of toResolve) {
                    await pronostic.update({ status: "awaiting_verification" }, { transaction: tx });
                }
            });
            return {
                resolved: 0,
                awaiting: toResolve.length,
                winningValue: null,
            };
        }

        // Save winning value to prediction
        const resolvedValue = winningValue;
        await pred.update({ winningValue: resolvedValue });

        // 3. Resolve and distribute points
        await sequelize.transaction(async (tx) => {
            for (const pronostic of toResolve) {
                const userValue = pronostic.detail?.value ?? "";
                
                let isWinner = false;
                let multiplier = pronostic.detail?.multiplier ?? 2;

                if (pred.type === 'PODIUM') {
                    const winningArr = resolvedValue.split(',');
                    const userArr = userValue.split(',');
                    const hasSameDrivers = winningArr.length === 3 && userArr.length === 3 && winningArr.every(d => userArr.includes(d));
                    const isExactOrder = userValue === resolvedValue;

                    if (isExactOrder) {
                        isWinner = true;
                        multiplier = 4; // x4 for exact order
                    } else if (hasSameDrivers) {
                        isWinner = true;
                        // base multiplier remains x2
                    } else {
                        isWinner = false;
                    }
                } else {
                    isWinner = userValue ? isWinnerForType(pred.type, userValue, resolvedValue) : false;
                }

                const pointsEarned = isWinner ? Math.floor(pronostic.pointsStaked * multiplier) : 0;

                await pronostic.update(
                    { status: isWinner ? "won" : "lost", pointsEarned },
                    { transaction: tx },
                );

                if (isWinner) {
                    const profile = await this.repo.findProfileByUserId(pronostic.userId, tx);
                    if (profile) {
                        await profile.update(
                            { points: profile.points + pointsEarned },
                            { transaction: tx },
                        );
                    }
                }
            }
        });

        return {
            resolved: toResolve.length,
            awaiting: 0,
            winningValue: resolvedValue,
        };
    }
}
