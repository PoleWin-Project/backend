import { httpErrors } from "../../common/errors/http";
import { LeaderboardRepository, SessionRankRow } from "./leaderboard.repository";

// ── Helpers ───────────────────────────────────────────────────────────────────

function encodeCursor(data: object): string {
    return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function buildSessionItems(rows: SessionRankRow[], rankOffset: number) {
    return rows.map((r, i) => ({
        rank:        rankOffset + i + 1,
        userId:      r.userId,
        username:    r.username,
        displayName: r.displayName,
        avatarUrl:   r.avatarUrl,
        netGain:     r.netGain,
        totalEarned: r.totalEarned,
        totalStaked: r.totalStaked,
    }));
}

// ── Service ───────────────────────────────────────────────────────────────────

export class LeaderboardService {
    constructor(private readonly repo = new LeaderboardRepository()) {}

    // ── Global ────────────────────────────────────────────────────────────────

    async getGlobal(limit: number, afterPoints?: number, afterUserId?: number, page?: number, sort: "points" | "winRate" | "netGain" = "points") {
        let rankOffset = 0;

        if (page) {
            rankOffset = (page - 1) * limit;
        } else if (afterPoints !== undefined && afterUserId !== undefined && sort === "points") {
            rankOffset = await this.repo.countGlobalBefore(afterPoints, afterUserId);
        }

        const [rows, total] = await Promise.all([
            this.repo.findGlobalPage(limit + 1, afterPoints, afterUserId, page, sort),
            this.repo.countGlobal(),
        ]);

        const hasMore    = rows.length > limit;
        const items      = hasMore ? rows.slice(0, limit) : rows;
        const last       = items[items.length - 1];
        const nextCursor = hasMore && sort === "points" ? encodeCursor({ p: last.points, u: last.userId }) : null;

        return {
            items: items.map((p, i) => ({
                rank:        rankOffset + i + 1,
                userId:      p.userId,
                username:    p.user?.username ?? null,
                displayName: p.displayName,
                avatarUrl:   p.avatarUrl,
                points:      p.points,
                winRate:     Number(p.getDataValue('winRate' as any) ?? 0),
                netGain:     Number(p.getDataValue('netGain' as any) ?? 0),
            })),
            nextCursor,
            total,
            limit,
        };
    }

    async getMyRank(userId: number) {
        const profile = await this.repo.findProfileByUserId(userId);
        if (!profile) throw httpErrors.notFound("Profile not found");

        const [rank, total] = await Promise.all([
            this.repo.countProfilesBefore(profile.points, userId),
            this.repo.countGlobal(),
        ]);

        return {
            userId,
            rank:        rank + 1,
            points:      profile.points,
            displayName: profile.displayName,
            avatarUrl:   profile.avatarUrl,
            total,
        };
    }

    // ── League ────────────────────────────────────────────────────────────────

    async getByLeague(leagueId: number, limit: number, afterPoints?: number, afterUserId?: number) {
        const league = await this.repo.findLeagueById(leagueId);
        if (!league) throw httpErrors.notFound("League not found");

        const rows   = await this.repo.findLeaguePage(leagueId, limit + 1, afterPoints, afterUserId);
        const hasMore = rows.length > limit;
        const items   = hasMore ? rows.slice(0, limit) : rows;

        const lastItem   = items[items.length - 1];
        const lastPoints = (lastItem?.user as any)?.profile?.points ?? 0;
        const nextCursor = hasMore ? encodeCursor({ p: lastPoints, u: lastItem.userId }) : null;

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

    // ── Session ───────────────────────────────────────────────────────────────

    async getBySession(sessionId: number, limit: number, afterNetGain?: number, afterUserId?: number) {
        let rankOffset = 0;

        if (afterNetGain !== undefined && afterUserId !== undefined) {
            rankOffset = await this.repo.countSessionBefore(sessionId, afterNetGain, afterUserId);
        }

        const [rows, total] = await Promise.all([
            this.repo.findSessionPage(sessionId, limit + 1, afterNetGain, afterUserId),
            this.repo.countSessionParticipants(sessionId),
        ]);

        const hasMore    = rows.length > limit;
        const items      = hasMore ? rows.slice(0, limit) : rows;
        const last       = items[items.length - 1];
        const nextCursor = hasMore ? encodeCursor({ ng: last.netGain, u: last.userId }) : null;

        return {
            sessionId,
            items:      buildSessionItems(items, rankOffset),
            nextCursor,
            total,
            limit,
        };
    }

    async getBySessionAndLeague(
        sessionId: number,
        leagueId: number,
        limit: number,
        afterNetGain?: number,
        afterUserId?: number,
    ) {
        const league = await this.repo.findLeagueById(leagueId);
        if (!league) throw httpErrors.notFound("League not found");

        let rankOffset = 0;

        if (afterNetGain !== undefined && afterUserId !== undefined) {
            rankOffset = await this.repo.countSessionLeagueBefore(sessionId, leagueId, afterNetGain, afterUserId);
        }

        const [rows, total] = await Promise.all([
            this.repo.findSessionLeaguePage(sessionId, leagueId, limit + 1, afterNetGain, afterUserId),
            this.repo.countSessionLeagueParticipants(sessionId, leagueId),
        ]);

        const hasMore    = rows.length > limit;
        const items      = hasMore ? rows.slice(0, limit) : rows;
        const last       = items[items.length - 1];
        const nextCursor = hasMore ? encodeCursor({ ng: last.netGain, u: last.userId }) : null;

        return {
            sessionId,
            league:     { id: league.id, name: league.name, seasonYear: league.seasonYear },
            items:      buildSessionItems(items, rankOffset),
            nextCursor,
            total,
            limit,
        };
    }
}
