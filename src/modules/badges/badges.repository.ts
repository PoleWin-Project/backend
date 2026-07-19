import { fn, col } from "sequelize";
import { BadgeModel, UserBadgeModel, UserModel } from "../../database/models";
import { CreateBadgeInput, UpdateBadgeInput } from "./badges.dto";

export class BadgesRepository {
    findAll() {
        return BadgeModel.findAll({ order: [["createdAt", "ASC"]] });
    }

    /** Nombre de détenteurs par badge. */
    async countHoldersByBadge(): Promise<{ badgeId: number; count: number }[]> {
        const rows = await UserBadgeModel.findAll({
            attributes: ["badgeId", [fn("COUNT", col("user_id")), "count"]],
            group: ["badgeId"],
            raw: true,
        });
        return (rows as unknown as { badgeId: number; count: number | string }[]).map((r) => ({
            badgeId: Number(r.badgeId),
            count: Number(r.count),
        }));
    }

    /** Nombre total d'utilisateurs (dénominateur du pourcentage). */
    countUsers(): Promise<number> {
        return UserModel.count();
    }

    findById(id: number) {
        return BadgeModel.findByPk(id);
    }

    create(data: CreateBadgeInput) {
        return BadgeModel.create(data as any);
    }

    async update(id: number, patch: UpdateBadgeInput) {
        const badge = await BadgeModel.findByPk(id);
        if (!badge) return null;
        return badge.update(patch);
    }

    async delete(id: number) {
        const badge = await BadgeModel.findByPk(id);
        if (!badge) return false;
        await badge.destroy();
        return true;
    }

    findUserBadges(userId: number) {
        return UserBadgeModel.findAll({
            where: { userId },
            include: [{ model: BadgeModel, as: "badge" }],
            order: [["awardedAt", "DESC"]],
        });
    }

    async awardBadge(userId: number, badgeId: number) {
        const [userBadge, created] = await UserBadgeModel.findOrCreate({
            where: { userId, badgeId },
            defaults: { userId, badgeId } as any,
        });
        return { userBadge, created };
    }

    revokeBadge(userId: number, badgeId: number) {
        return UserBadgeModel.destroy({ where: { userId, badgeId } });
    }
}
