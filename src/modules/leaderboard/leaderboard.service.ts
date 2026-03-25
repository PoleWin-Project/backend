import { Op } from "sequelize";
import { httpErrors } from "../../common/errors/http";
import { LeagueModel, LeagueMemberModel, ProfileModel, UserModel } from "../../database/models";

export class LeaderboardService {

    async getGlobal(limit: number, afterPoints?: number, afterUserId?: number) {
        const where: any = {};

        if (afterPoints !== undefined && afterUserId !== undefined) {
            where[Op.or as any] = [
                { points: { [Op.lt]: afterPoints } },
                { points: afterPoints, userId: { [Op.gt]: afterUserId } },
            ];
        }

        const rows = await ProfileModel.findAll({
            where,
            include: [
                {
                    model: UserModel,
                    as: "user",
                    attributes: ["id", "username"],
                },
            ],
            order: [["points", "DESC"], ["userId", "ASC"]],
            limit: limit + 1,
        });

        const hasMore = rows.length > limit;
        const items   = hasMore ? rows.slice(0, limit) : rows;

        const nextCursor = hasMore
            ? Buffer.from(JSON.stringify({ p: items[items.length - 1].points, u: items[items.length - 1].userId })).toString("base64url")
            : null;

        return {
            items: items.map((p) => ({
                userId:      p.userId,
                username:    p.user?.username ?? null,
                displayName: p.displayName,
                avatarUrl:   p.avatarUrl,
                points:      p.points,
            })),
            nextCursor,
            limit,
        };
    }

    async getByLeague(leagueId: number, limit: number, afterPoints?: number, afterUserId?: number) {
        const league = await LeagueModel.findByPk(leagueId, {
            attributes: ["id", "name", "seasonYear"],
        });
        if (!league) throw httpErrors.notFound("League not found");

        const memberWhere: any = { leagueId };

        if (afterPoints !== undefined && afterUserId !== undefined) {
            memberWhere[Op.or as any] = [
                { "$user.profile.points$": { [Op.lt]: afterPoints } },
                { "$user.profile.points$": afterPoints, userId: { [Op.gt]: afterUserId } },
            ];
        }

        const rows = await LeagueMemberModel.findAll({
            where: memberWhere,
            include: [
                {
                    model: UserModel,
                    as: "user",
                    attributes: ["id", "username"],
                    include: [
                        {
                            model: ProfileModel,
                            as: "profile",
                            attributes: ["points", "displayName", "avatarUrl"],
                        },
                    ],
                },
            ],
            order: [
                [{ model: UserModel, as: "user" }, { model: ProfileModel, as: "profile" }, "points", "DESC"],
                ["userId", "ASC"],
            ],
            limit: limit + 1,
        });

        const hasMore = rows.length > limit;
        const items   = hasMore ? rows.slice(0, limit) : rows;

        const lastItem  = items[items.length - 1];
        const lastPoints = (lastItem?.user as any)?.profile?.points ?? 0;
        const nextCursor = hasMore
            ? Buffer.from(JSON.stringify({ p: lastPoints, u: lastItem.userId })).toString("base64url")
            : null;

        return {
            league: { id: league.id, name: league.name, seasonYear: league.seasonYear },
            items: items.map((m) => ({
                userId:      m.userId,
                username:    (m.user as any)?.username ?? null,
                displayName: (m.user as any)?.profile?.displayName ?? null,
                avatarUrl:   (m.user as any)?.profile?.avatarUrl ?? null,
                points:      (m.user as any)?.profile?.points ?? 0,
                joinedAt:    m.joinedAt,
            })),
            nextCursor,
            limit,
        };
    }
}
