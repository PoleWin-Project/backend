import { fn, col, literal } from "sequelize";
import { httpErrors } from "../../common/errors/http";
import { PronosticModel } from "../../database/models";
import { UsersRepository } from "./users.repository";
import {
    AdminUpdateUserInput,
    ListUsersQuery,
    UpdateMeInput,
} from "./users.dto";

export class UsersService {
    constructor(private readonly repo = new UsersRepository()) { }

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
}
