import { Request, Response, NextFunction } from "express";
import { LeaderboardService } from "./leaderboard.service";

function parseCursor(cursor: string | undefined): { p: number; u: number } | undefined {
    if (!cursor) return undefined;
    try {
        return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    } catch {
        return undefined;
    }
}

export class LeaderboardController {
    constructor(private readonly service = new LeaderboardService()) {}

    getGlobal = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const limit  = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50;
            const cursor = parseCursor(req.query.cursor as string | undefined);
            const data   = await this.service.getGlobal(limit, cursor?.p, cursor?.u);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    getByLeague = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const leagueId = Number(req.params.leagueId);
            const limit    = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50;
            const cursor   = parseCursor(req.query.cursor as string | undefined);
            const data     = await this.service.getByLeague(leagueId, limit, cursor?.p, cursor?.u);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };
}
