import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { LeagueModel, LeagueMemberModel, ProfileModel, UserModel } from "../../database/models";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionRankRow {
    userId:       number;
    username:     string;
    displayName:  string | null;
    avatarUrl:    string | null;
    netGain:      number;
    totalEarned:  number;
    totalStaked:  number;
}

interface CountRow { count: string }

// ── Repository ────────────────────────────────────────────────────────────────

export class LeaderboardRepository {

    // ── Global ────────────────────────────────────────────────────────────────

    findGlobalPage(limit: number, afterPoints?: number, afterUserId?: number) {
        const where: any = {};

        if (afterPoints !== undefined && afterUserId !== undefined) {
            where[Op.or as any] = [
                { points: { [Op.lt]: afterPoints } },
                { points: afterPoints, userId: { [Op.gt]: afterUserId } },
            ];
        }

        return ProfileModel.findAll({
            where,
            include: [{ model: UserModel, as: "user", attributes: ["id", "username"] }],
            order: [["points", "DESC"], ["userId", "ASC"]],
            limit,
        });
    }

    countGlobal() {
        return ProfileModel.count();
    }

    countGlobalBefore(afterPoints: number, afterUserId: number) {
        return ProfileModel.count({
            where: {
                [Op.or as any]: [
                    { points: { [Op.gt]: afterPoints } },
                    { points: afterPoints, userId: { [Op.lte]: afterUserId } },
                ],
            },
        });
    }

    findProfileByUserId(userId: number) {
        return ProfileModel.findOne({ where: { userId } });
    }

    countProfilesBefore(points: number, userId: number) {
        return ProfileModel.count({
            where: {
                [Op.or as any]: [
                    { points: { [Op.gt]: points } },
                    { points, userId: { [Op.lt]: userId } },
                ],
            },
        });
    }

    // ── League ────────────────────────────────────────────────────────────────

    findLeagueById(leagueId: number) {
        return LeagueModel.findByPk(leagueId, { attributes: ["id", "name", "seasonYear"] });
    }

    findLeaguePage(leagueId: number, limit: number, afterPoints?: number, afterUserId?: number) {
        const where: any = { leagueId };

        if (afterPoints !== undefined && afterUserId !== undefined) {
            where[Op.or as any] = [
                { "$user.profile.points$": { [Op.lt]: afterPoints } },
                { "$user.profile.points$": afterPoints, userId: { [Op.gt]: afterUserId } },
            ];
        }

        return LeagueMemberModel.findAll({
            where,
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
            limit,
        });
    }

    // ── Session (raw SQL aggregates) ──────────────────────────────────────────

    /**
     * Builds the inner aggregate SQL shared by both session queries.
     * Optionally filters to members of a league via a JOIN.
     */
    private sessionAggregateSQL(leagueId?: number): string {
        const leagueJoin = leagueId !== undefined
            ? `JOIN league_members lm ON lm.user_id = p.user_id AND lm.league_id = :leagueId`
            : "";

        return `
            SELECT
                p.user_id                                                   AS "userId",
                u.username,
                prof.display_name                                           AS "displayName",
                prof.avatar_url                                             AS "avatarUrl",
                CAST(SUM(p.points_earned) - SUM(p.points_staked) AS INT)   AS "netGain",
                CAST(SUM(p.points_earned) AS INT)                          AS "totalEarned",
                CAST(SUM(p.points_staked) AS INT)                          AS "totalStaked"
            FROM pronostics p
            JOIN predictions pred ON pred.id = p.prediction_id AND pred.session_id = :sessionId
            JOIN users u          ON u.id   = p.user_id
            JOIN profiles prof    ON prof.user_id = p.user_id
            ${leagueJoin}
            WHERE p.status IN ('won', 'lost')
            GROUP BY p.user_id, u.username, prof.display_name, prof.avatar_url
        `;
    }

    findSessionPage(
        sessionId: number,
        limit: number,
        afterNetGain?: number,
        afterUserId?: number,
    ) {
        const cursorClause = afterNetGain !== undefined && afterUserId !== undefined
            ? `WHERE "netGain" < :afterNetGain OR ("netGain" = :afterNetGain AND "userId" > :afterUserId)`
            : "";

        const sql = `
            SELECT * FROM (${this.sessionAggregateSQL()}) ranked
            ${cursorClause}
            ORDER BY "netGain" DESC, "userId" ASC
            LIMIT :limit
        `;

        return sequelize.query<SessionRankRow>(sql, {
            replacements: { sessionId, limit, afterNetGain, afterUserId },
            type: QueryTypes.SELECT,
        });
    }

    countSessionParticipants(sessionId: number) {
        const sql = `
            SELECT COUNT(*) AS count FROM (${this.sessionAggregateSQL()}) ranked
        `;
        return sequelize.query<CountRow>(sql, {
            replacements: { sessionId },
            type: QueryTypes.SELECT,
        }).then((r) => Number(r[0]?.count ?? 0));
    }

    countSessionBefore(sessionId: number, afterNetGain: number, afterUserId: number) {
        const sql = `
            SELECT COUNT(*) AS count FROM (${this.sessionAggregateSQL()}) ranked
            WHERE "netGain" > :afterNetGain OR ("netGain" = :afterNetGain AND "userId" <= :afterUserId)
        `;
        return sequelize.query<CountRow>(sql, {
            replacements: { sessionId, afterNetGain, afterUserId },
            type: QueryTypes.SELECT,
        }).then((r) => Number(r[0]?.count ?? 0));
    }

    findSessionLeaguePage(
        sessionId: number,
        leagueId: number,
        limit: number,
        afterNetGain?: number,
        afterUserId?: number,
    ) {
        const cursorClause = afterNetGain !== undefined && afterUserId !== undefined
            ? `WHERE "netGain" < :afterNetGain OR ("netGain" = :afterNetGain AND "userId" > :afterUserId)`
            : "";

        const sql = `
            SELECT * FROM (${this.sessionAggregateSQL(leagueId)}) ranked
            ${cursorClause}
            ORDER BY "netGain" DESC, "userId" ASC
            LIMIT :limit
        `;

        return sequelize.query<SessionRankRow>(sql, {
            replacements: { sessionId, leagueId, limit, afterNetGain, afterUserId },
            type: QueryTypes.SELECT,
        });
    }

    countSessionLeagueParticipants(sessionId: number, leagueId: number) {
        const sql = `
            SELECT COUNT(*) AS count FROM (${this.sessionAggregateSQL(leagueId)}) ranked
        `;
        return sequelize.query<CountRow>(sql, {
            replacements: { sessionId, leagueId },
            type: QueryTypes.SELECT,
        }).then((r) => Number(r[0]?.count ?? 0));
    }

    countSessionLeagueBefore(
        sessionId: number,
        leagueId: number,
        afterNetGain: number,
        afterUserId: number,
    ) {
        const sql = `
            SELECT COUNT(*) AS count FROM (${this.sessionAggregateSQL(leagueId)}) ranked
            WHERE "netGain" > :afterNetGain OR ("netGain" = :afterNetGain AND "userId" <= :afterUserId)
        `;
        return sequelize.query<CountRow>(sql, {
            replacements: { sessionId, leagueId, afterNetGain, afterUserId },
            type: QueryTypes.SELECT,
        }).then((r) => Number(r[0]?.count ?? 0));
    }
}
