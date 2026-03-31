import { ProfileModel } from "../../database/models";
import { httpErrors } from "../../common/errors/http";
import { sequelize } from "../../database/sequelize";

export class GamesService {
    // Simple reward system with a daily cap to prevent abuse
    // In a real production app, we would store game attempts in a separate table
    async rewardUser(userId: number, points: number, gameId: string) {
        if (points <= 0) throw httpErrors.badRequest("Invalid points amount");
        if (points > 100) throw httpErrors.badRequest("Max reward per game exceeded");

        return sequelize.transaction(async (tx) => {
            const profile = await ProfileModel.findOne({
                where: { userId },
                transaction: tx,
            });

            if (!profile) throw httpErrors.notFound("Profile not found");

            // Update points
            await profile.update({
                points: profile.points + points
            }, { transaction: tx });

            return {
                newTotal: profile.points,
                rewarded: points,
                message: `Bravo ! Vous avez gagné ${points} points au Garage.`
            };
        });
    }
}
