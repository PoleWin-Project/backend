import { Request, Response, NextFunction } from "express";
import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardQuery } from "./leaderboard.dto";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseGlobalCursor(cursor: string | undefined): { p: number; u: number } | undefined {
    if (!cursor) return undefined;
    try {
        return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    } catch {
        return undefined;
    }
}

function parseSessionCursor(cursor: string | undefined): { ng: number; u: number } | undefined {
    if (!cursor) return undefined;
    try {
        return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    } catch {
        return undefined;
    }
}

// ── Controller ────────────────────────────────────────────────────────────────

export class LeaderboardController {
    constructor(private readonly service = new LeaderboardService()) {}

    getGlobal = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { limit, cursor } = req.query as unknown as LeaderboardQuery;
            const c    = parseGlobalCursor(cursor);
            const data = await this.service.getGlobal(limit, c?.p, c?.u);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    getMyRank = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.getMyRank(req.user!.id);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    getByLeague = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const leagueId = Number(req.params.leagueId);
            const { limit, cursor } = req.query as unknown as LeaderboardQuery;
            const c    = parseGlobalCursor(cursor);
            const data = await this.service.getByLeague(leagueId, limit, c?.p, c?.u);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    getBySession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = Number(req.params.sessionId);
            const { limit, cursor } = req.query as unknown as LeaderboardQuery;
            const c    = parseSessionCursor(cursor);
            const data = await this.service.getBySession(sessionId, limit, c?.ng, c?.u);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    getBySessionAndLeague = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = Number(req.params.sessionId);
            const leagueId  = Number(req.params.leagueId);
            const { limit, cursor } = req.query as unknown as LeaderboardQuery;
            const c    = parseSessionCursor(cursor);
            const data = await this.service.getBySessionAndLeague(sessionId, leagueId, limit, c?.ng, c?.u);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };
}
