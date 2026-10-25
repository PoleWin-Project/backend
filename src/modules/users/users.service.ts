import { fn, col, literal } from "sequelize";
import { httpErrors } from "../../common/errors/http";
import { PronosticModel } from "../../database/models";
import { UsersRepository } from "./users.repository";
import { isChampionshipMode } from "../../config/env";
import { championshipService } from "../championship/championship.service";
import { FriendsRepository } from "../friends/friends.repository";
import {
    AdminUpdateUserInput,
    ListUsersQuery,
    UpdateMeInput,
} from "./users.dto";

export class UsersService {
    constructor(
        private readonly repo = new UsersRepository(),
        private readonly friendsRepo = new FriendsRepository(),
    ) { }

    async getMe(userId: number) {
        const user = await this.repo.findById(userId);
        if (!user) throw httpErrors.notFound("User not found");
        return user;
    }

    async getPublicProfile(userId: string) {
        const user = await this.repo.findPublicById(userId);
        if (!user) throw httpErrors.notFound("Public profile not found");
        return user;
    }

    async listUsers(query: ListUsersQuery) {
        const { rows, count } = await this.repo.list(query);
        return {
            items: rows,
            total: count,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + rows.length < count,
        };
    }

    async updateMe(userId: number, input: UpdateMeInput) {
        if (input.username) {
            const exists = await this.repo.usernameExists(
                input.username,
                userId
            );
            if (exists) throw httpErrors.conflict("Username already used");
        }

        const updated = await this.repo.updateMe(userId, input);
        if (!updated) throw httpErrors.notFound("User not found");
        return updated;
    }

    async getMyStats(userId: number) {
        if (isChampionshipMode()) return this.getChampionshipStats(userId);
        return this.getLegacyStats(userId);
    }

    /**
     * Stats du modèle championship : précision des pronostics et points de championnat.
     * Plus aucune notion de mise, de gain net ou de « bilan ».
     */
    private async getChampionshipStats(userId: number) {
        const rows = await PronosticModel.findAll({
            where: { userId, scoringModel: "fixed_reward" },
            attributes: ["status", [fn("COUNT", col("id")), "count"]],
            group: ["status"],
            raw: true,
        }) as any[];
        const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
        const correct   = byStatus["won"] ?? 0;
        const incorrect = byStatus["lost"] ?? 0;
        const pending   = (byStatus["submitted"] ?? 0) + (byStatus["awaiting_verification"] ?? 0);
        const score = await championshipService.getActiveSeasonScore(userId);

        return {
            total: correct + incorrect + pending,
            correct,
            incorrect,
            pending,
            accuracy: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0,
            championshipPoints: score.points,
            season: score.season,
            // Alias pour les anciens clients (affichaient `won` / `winRate`).
            won: correct,
            lost: incorrect,
            winRate: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0,
        };
    }

    /** [MODÈLE LEGACY] Stats incluant mises et gain net. */
    private async getLegacyStats(userId: number) {
        const rows = await PronosticModel.findAll({
            where: { userId },
            attributes: [
                "status",
                [fn("COUNT", col("id")),          "count"],
                [fn("SUM", col("points_staked")), "staked"],
                [fn("SUM", col("points_earned")), "earned"],
            ],
            group: ["status"],
            raw: true,
        }) as any[];

        const byStatus = Object.fromEntries(rows.map((r) => [r.status, r]));

        const won     = Number(byStatus["won"]?.count  ?? 0);
        const lost    = Number(byStatus["lost"]?.count ?? 0);
        const pending = (["submitted", "awaiting_verification", "draft"] as const)
            .reduce((s, st) => s + Number(byStatus[st]?.count ?? 0), 0);
        const total   = won + lost + pending;

        const totalStaked = rows.reduce((s, r) => s + Number(r.staked ?? 0), 0);
        const totalEarned = rows.reduce((s, r) => s + Number(r.earned ?? 0), 0);

        return {
            total,
            won,
            lost,
            pending,
            winRate: total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0,
            totalStaked,
            totalEarned,
            netGain: totalEarned - totalStaked,
        };
    }

    async searchUsers(q: string) {
        if (!q || q.trim().length < 1) return [];
        return this.repo.searchPublic(q.trim(), 20);
    }

    async adminUpdateUser(userId: number, input: AdminUpdateUserInput) {
        const updated = await this.repo.adminUpdateUser(userId, input);
        if (!updated) throw httpErrors.notFound("User not found");
        return updated;
    }
    async deleteMe(userId: number) {
        const deleted = await this.repo.delete(userId);
        if (!deleted) throw httpErrors.notFound("User not found");
        return true;
    }

    async getPublicFriendsCount(userId: number) {
        return this.friendsRepo.countFriends(userId);
    }
}
