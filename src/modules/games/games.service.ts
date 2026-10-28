import { Op, Transaction } from "sequelize";
import { GamePlayModel, ProfileModel } from "../../database/models";
import { httpErrors } from "../../common/errors/http";
import { sequelize } from "../../database/sequelize";

const DAILY_LIMIT = 3;

function startOfTodayUTC(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

export class GamesService {

    async countPlaysToday(userId: number, gameId: string, tx?: Transaction): Promise<number> {
        return GamePlayModel.count({
            where: {
                userId,
                gameId,
                playedAt: { [Op.gte]: startOfTodayUTC() },
            },
            transaction: tx,
        });
    }

    async getPlaysToday(userId: number, gameId: string, isAdmin: boolean) {
        const played = await this.countPlaysToday(userId, gameId);
        return {
            played,
            limit: isAdmin ? null : DAILY_LIMIT,
        };
    }

    async rewardUser(userId: number, points: number, gameId: string, isAdmin: boolean) {
        if (gameId !== "reaction" || !Number.isInteger(points) || points < 2 || points > 50) {
            throw httpErrors.badRequest("Invalid game reward");
        }

        return sequelize.transaction(async (tx) => {
            const profile = await ProfileModel.findOne({
                where: { userId },
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });
            if (!profile) throw httpErrors.notFound("Profile not found");
            const played = await this.countPlaysToday(userId, gameId, tx);
            if (!isAdmin && played >= DAILY_LIMIT) {
                throw httpErrors.forbidden(`Limite journalière atteinte (${DAILY_LIMIT} parties/jour). Reviens demain !`);
            }

            await profile.update({ points: profile.points + points }, { transaction: tx });
            await GamePlayModel.create({ userId, gameId, points, playedAt: new Date() }, { transaction: tx });

            const playsToday = played + 1;

            return {
                newTotal:   profile.points,
                rewarded:   points,
                playsToday,
                playsLeft:  DAILY_LIMIT - playsToday,
                message:    `Bravo ! Vous avez gagné ${points} points au Garage.`,
            };
        });
    }
}
