import { Op } from "sequelize";
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

    async countPlaysToday(userId: number, gameId: string): Promise<number> {
        return GamePlayModel.count({
            where: {
                userId,
                gameId,
                playedAt: { [Op.gte]: startOfTodayUTC() },
            },
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
        if (points <= 0)   throw httpErrors.badRequest("Invalid points amount");
        if (points > 100)  throw httpErrors.badRequest("Max reward per game exceeded");

        if (!isAdmin) {
            const played = await this.countPlaysToday(userId, gameId);
            if (played >= DAILY_LIMIT) {
                throw httpErrors.forbidden(
                    `Limite journalière atteinte (${DAILY_LIMIT} parties/jour). Reviens demain !`
                );
            }
        }

        return sequelize.transaction(async (tx) => {
            const profile = await ProfileModel.findOne({
                where: { userId },
                transaction: tx,
            });
            if (!profile) throw httpErrors.notFound("Profile not found");

            await Promise.all([
                profile.update({ points: profile.points + points }, { transaction: tx }),
                GamePlayModel.create({ userId, gameId, points, playedAt: new Date() }, { transaction: tx }),
            ]);

            const playsToday = await this.countPlaysToday(userId, gameId);

            return {
                newTotal:   profile.points + points,
                rewarded:   points,
                playsToday,
                playsLeft:  DAILY_LIMIT - playsToday,
                message:    `Bravo ! Vous avez gagné ${points} points au Garage.`,
            };
        });
    }
}
