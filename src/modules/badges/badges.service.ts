import { UserModel } from "../../database/models";
import { httpErrors } from "../../common/errors/http";
import { BadgesRepository } from "./badges.repository";
import { CreateBadgeInput, UpdateBadgeInput } from "./badges.dto";
import { notifyUser } from "../push/push.service";
import { emitToUser } from "../../socket/ws.handler";

export class BadgesService {
    constructor(private readonly repo = new BadgesRepository()) {}

    getAllBadges() {
        return this.repo.findAll();
    }

    createBadge(data: CreateBadgeInput) {
        return this.repo.create(data);
    }

    async updateBadge(id: number, patch: UpdateBadgeInput) {
        const badge = await this.repo.update(id, patch);
        if (!badge) throw httpErrors.notFound("Badge not found");
        return badge;
    }

    async deleteBadge(id: number) {
        const deleted = await this.repo.delete(id);
        if (!deleted) throw httpErrors.notFound("Badge not found");
    }

    async getUserBadges(userId: number) {
        const user = await UserModel.findByPk(userId, { attributes: ["id"] });
        if (!user) throw httpErrors.notFound("User not found");
        return this.repo.findUserBadges(userId);
    }

    async awardBadge(userId: number, badgeId: number) {
        const [user, badge] = await Promise.all([
            UserModel.findByPk(userId, { attributes: ["id"] }),
            this.repo.findById(badgeId),
        ]);
        if (!user)  throw httpErrors.notFound("User not found");
        if (!badge) throw httpErrors.notFound("Badge not found");

        const { userBadge, created } = await this.repo.awardBadge(userId, badgeId);
        if (!created) throw httpErrors.conflict("User already has this badge");

        // Notifier l'utilisateur du nouveau badge (best-effort)
        emitToUser(userId, "badge:awarded", { badgeId, name: (badge as any).name });
        void notifyUser(userId, {
            title: "🏅 Nouveau badge débloqué !",
            body: (badge as any).name ? `Tu as obtenu : ${(badge as any).name}` : "Tu as débloqué un nouveau badge.",
            data: { type: "badge", badgeId },
        });

        return userBadge;
    }

    async revokeBadge(userId: number, badgeId: number) {
        const deleted = await this.repo.revokeBadge(userId, badgeId);
        if (!deleted) throw httpErrors.notFound("Badge not assigned to this user");
    }
}
