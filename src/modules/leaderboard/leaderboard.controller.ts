import { paddockService } from "../paddock/paddock.service";
import { Request, Response, NextFunction } from "express";
import { LeaderboardService } from "./leaderboard.service";
import { ChampionshipLeaderboardService } from "./leaderboard.championship.service";
import { LeaderboardQuery, LeaderboardQueryDto } from "./leaderboard.dto";
import { isChampionshipMode } from "../../config/env";

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

/**
 * Mode championship : offset de pagination, depuis le curseur opaque `{ o }` ou,
 * à défaut, depuis `page`. Un curseur legacy ({ p, u }) est ignoré (retour page 1).
 */
function championshipOffset(query: LeaderboardQuery): number {
    if (query.cursor) {
        try {
            const c = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
            if (Number.isInteger(c?.o) && c.o >= 0) return c.o;
        } catch { /* curseur invalide → page 1 */ }
    }
    return query.page ? (query.page - 1) * query.limit : 0;
}

/** Une seule lecture des équipements pour toute la page du classement. */
async function withAvatars<T extends { items?: { userId: number }[]; userId?: number }>(data: T) {
    const ids = data.items?.map(item => item.userId) ?? (data.userId != null ? [data.userId] : []);
    const appearances = await paddockService.appearances(ids);
    return {
        ...data,
        ...(data.items ? { items: data.items.map(item => ({ ...item, cosmetics: appearances.get(item.userId) })) } : {}),
        ...(data.userId != null ? { cosmetics: appearances.get(data.userId) } : {}),
    };
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * Les routes sont identiques dans les deux modèles ; seule la source change :
 *  - legacy       : profiles.points / gain net des paris ;
 *  - championship : points de championnat de la saison active.
 */
export class LeaderboardController {
    constructor(
        private readonly service = new LeaderboardService(),
        private readonly championship = new ChampionshipLeaderboardService(),
    ) {}

    getGlobal = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = LeaderboardQueryDto.parse(req.query);
            if (isChampionshipMode()) {
                // « netGain » (bilan gains − mises) n'existe plus : repli sur les points.
                const sort = query.sort === "winRate" ? "winRate" : "points";
                const data = await this.championship.getGlobal(query.limit, championshipOffset(query), sort);
                res.json({ status: "ok", ...await withAvatars(data) });
                return;
            }
            const { limit, cursor, page, sort } = query;
            const c    = parseGlobalCursor(cursor);
            const data = await this.service.getGlobal(limit, c?.p, c?.u, page, sort);
            res.json({ status: "ok", ...await withAvatars(data) });
        } catch (e) {
            next(e);
        }
    };

    getMyRank = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = isChampionshipMode()
                ? await this.championship.getMyRank(req.user!.id)
                : await this.service.getMyRank(req.user!.id);
            res.json({ status: "ok", ...await withAvatars(data) });
        } catch (e) {
            next(e);
        }
    };

    getByLeague = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const leagueId = Number(req.params.leagueId);
            const query = LeaderboardQueryDto.parse(req.query);
            if (isChampionshipMode()) {
                const data = await this.championship.getByLeague(leagueId, query.limit, championshipOffset(query));
                res.json({ status: "ok", ...await withAvatars(data) });
                return;
            }
            const c    = parseGlobalCursor(query.cursor);
            const data = await this.service.getByLeague(leagueId, query.limit, c?.p, c?.u);
            res.json({ status: "ok", ...await withAvatars(data) });
        } catch (e) {
            next(e);
        }
    };

    getBySession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = Number(req.params.sessionId);
            const query = LeaderboardQueryDto.parse(req.query);
            if (isChampionshipMode()) {
                const data = await this.championship.getBySession(sessionId, query.limit, championshipOffset(query));
                res.json({ status: "ok", ...await withAvatars(data) });
                return;
            }
            const c    = parseSessionCursor(query.cursor);
            const data = await this.service.getBySession(sessionId, query.limit, c?.ng, c?.u);
            res.json({ status: "ok", ...await withAvatars(data) });
        } catch (e) {
            next(e);
        }
    };

    getBySessionAndLeague = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = Number(req.params.sessionId);
            const leagueId  = Number(req.params.leagueId);
            const query = LeaderboardQueryDto.parse(req.query);
            if (isChampionshipMode()) {
                const data = await this.championship.getBySession(
                    sessionId, query.limit, championshipOffset(query), leagueId,
                );
                res.json({ status: "ok", ...await withAvatars(data) });
                return;
            }
            const c    = parseSessionCursor(query.cursor);
            const data = await this.service.getBySessionAndLeague(sessionId, leagueId, query.limit, c?.ng, c?.u);
            res.json({ status: "ok", ...await withAvatars(data) });
        } catch (e) {
            next(e);
        }
    };
}
