import { QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { httpErrors } from "../../common/errors/http";
import { LeagueModel } from "../../database/models";
import { seasonsService } from "../seasons/seasons.service";

/**
 * Classements du modèle « championship » (SCORING_MODEL=championship).
 *
 * Source : points de championnat de la saison ACTIVE (`season_scores`), qui ne
 * proviennent QUE de pronostics corrects. Les crédits Garage n'interviennent jamais.
 * L'ancien tri « Bilan » (gains − mises) n'existe plus : un ancien client qui demande
 * sort=netGain reçoit le classement par points.
 *
 * Égalités : rang PARTAGÉ (RANK()) — deux joueurs à égalité de points ont le même
 * rang ; l'ordre d'affichage entre eux est ensuite stable (user_id).
 * Pagination par offset (encodé dans un curseur opaque `{ o }`) : volumétrie faible.
 */

export type ChampionshipSort = "points" | "winRate";

export interface ChampionshipRankRow {
    rank: number;
    userId: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    points: number;
    correctCount: number;
    resolvedCount: number;
    winRate: number;
}

function encodeOffsetCursor(offset: number): string {
    return Buffer.from(JSON.stringify({ o: offset })).toString("base64url");
}

/** Clause de tri + expression de rang selon le tri demandé. */
function orderFor(sort: ChampionshipSort) {
    return sort === "winRate"
        ? { rankOrder: `"winRate" DESC, points DESC`, rowOrder: `"winRate" DESC, points DESC, "userId" ASC` }
        : { rankOrder: `points DESC`, rowOrder: `points DESC, "userId" ASC` };
}

export class ChampionshipLeaderboardService {
    private async requireActiveSeason() {
        const season = await seasonsService.getActiveSeason();
        if (!season) throw httpErrors.serviceUnavailable("Aucune saison de championnat active", "NO_ACTIVE_SEASON");
        return season;
    }

    /**
     * Base commune : tous les joueurs (avec 0 point s'ils n'ont pas encore de ligne
     * season_scores), éventuellement restreints aux membres d'une ligue.
     */
    private baseSQL(leagueFilter: boolean) {
        return `
            SELECT u.id                               AS "userId",
                   u.username,
                   p.display_name                     AS "displayName",
                   p.avatar_url                       AS "avatarUrl",
                   COALESCE(s.points, 0)              AS points,
                   COALESCE(s.correct_count, 0)       AS "correctCount",
                   COALESCE(s.resolved_count, 0)      AS "resolvedCount",
                   CASE WHEN COALESCE(s.resolved_count, 0) = 0 THEN 0
                        ELSE ROUND(s.correct_count * 100.0 / s.resolved_count)::int END AS "winRate"
              FROM users u
              JOIN profiles p ON p.user_id = u.id
              ${leagueFilter ? "JOIN league_members lm ON lm.user_id = u.id AND lm.league_id = :leagueId" : ""}
              LEFT JOIN season_scores s ON s.user_id = u.id AND s.season_id = :seasonId
        `;
    }

    private async rankedPage(params: {
        seasonId: number;
        sort: ChampionshipSort;
        limit: number;
        offset: number;
        leagueId?: number;
    }) {
        const { rankOrder, rowOrder } = orderFor(params.sort);
        const leagueFilter = params.leagueId !== undefined;
        const rows = await sequelize.query<ChampionshipRankRow>(
            `SELECT RANK() OVER (ORDER BY ${rankOrder})::int AS rank, base.*
               FROM (${this.baseSQL(leagueFilter)}) base
              ORDER BY ${rowOrder}
              LIMIT :limit OFFSET :offset`,
            {
                replacements: {
                    seasonId: params.seasonId,
                    leagueId: params.leagueId,
                    limit: params.limit + 1,
                    offset: params.offset,
                },
                type: QueryTypes.SELECT,
            },
        );
        const [{ count }] = await sequelize.query<{ count: string }>(
            `SELECT COUNT(*) AS count FROM (${this.baseSQL(leagueFilter)}) base`,
            { replacements: { seasonId: params.seasonId, leagueId: params.leagueId }, type: QueryTypes.SELECT },
        );

        const hasMore = rows.length > params.limit;
        const items = hasMore ? rows.slice(0, params.limit) : rows;
        return {
            items,
            total: Number(count),
            nextCursor: hasMore ? encodeOffsetCursor(params.offset + params.limit) : null,
        };
    }

    async getGlobal(limit: number, offset: number, sort: ChampionshipSort) {
        const season = await this.requireActiveSeason();
        const page = await this.rankedPage({ seasonId: season.id, sort, limit, offset });
        return { season: { id: season.id, code: season.code, name: season.name }, ...page, limit };
    }

    async getMyRank(userId: number) {
        const season = await this.requireActiveSeason();
        const rows = await sequelize.query<ChampionshipRankRow & { total: number }>(
            `SELECT * FROM (
                 SELECT RANK() OVER (ORDER BY points DESC)::int AS rank,
                        COUNT(*) OVER ()::int                   AS total,
                        base.*
                   FROM (${this.baseSQL(false)}) base
             ) ranked
             WHERE "userId" = :userId`,
            { replacements: { seasonId: season.id, userId }, type: QueryTypes.SELECT },
        );
        const me = rows[0];
        if (!me) throw httpErrors.notFound("Profile not found");
        return {
            userId,
            season: { id: season.id, code: season.code, name: season.name },
            rank: me.rank,
            points: me.points,
            correctCount: me.correctCount,
            resolvedCount: me.resolvedCount,
            displayName: me.displayName,
            avatarUrl: me.avatarUrl,
            total: me.total,
        };
    }

    async getByLeague(leagueId: number, limit: number, offset: number) {
        const league = await LeagueModel.findByPk(leagueId, { attributes: ["id", "name", "seasonYear"] });
        if (!league) throw httpErrors.notFound("League not found");
        const season = await this.requireActiveSeason();
        const page = await this.rankedPage({ seasonId: season.id, sort: "points", limit, offset, leagueId });
        return {
            league: { id: league.id, name: league.name, seasonYear: league.seasonYear },
            season: { id: season.id, code: season.code, name: season.name },
            ...page,
            limit,
        };
    }

    /**
     * Classement d'une session : points de championnat obtenus sur les prédictions de
     * cette session (uniquement les pronostics du nouveau modèle déjà résolus).
     */
    async getBySession(sessionId: number, limit: number, offset: number, leagueId?: number) {
        if (leagueId !== undefined) {
            const league = await LeagueModel.findByPk(leagueId);
            if (!league) throw httpErrors.notFound("League not found");
        }
        const leagueJoin = leagueId !== undefined
            ? "JOIN league_members lm ON lm.user_id = p.user_id AND lm.league_id = :leagueId"
            : "";
        const base = `
            SELECT p.user_id                                          AS "userId",
                   u.username,
                   prof.display_name                                  AS "displayName",
                   prof.avatar_url                                    AS "avatarUrl",
                   SUM(p.championship_points_awarded)::int            AS points,
                   COUNT(*) FILTER (WHERE p.status = 'won')::int      AS "correctCount",
                   COUNT(*)::int                                      AS "resolvedCount"
              FROM pronostics p
              JOIN predictions pred ON pred.id = p.prediction_id AND pred.session_id = :sessionId
              JOIN users u          ON u.id = p.user_id
              JOIN profiles prof    ON prof.user_id = p.user_id
              ${leagueJoin}
             WHERE p.scoring_model = 'fixed_reward' AND p.status IN ('won', 'lost')
             GROUP BY p.user_id, u.username, prof.display_name, prof.avatar_url
        `;
        const replacements = { sessionId, leagueId, limit: limit + 1, offset };
        const rows = await sequelize.query<ChampionshipRankRow>(
            `SELECT RANK() OVER (ORDER BY points DESC)::int AS rank, base.*
               FROM (${base}) base
              ORDER BY points DESC, "userId" ASC
              LIMIT :limit OFFSET :offset`,
            { replacements, type: QueryTypes.SELECT },
        );
        const [{ count }] = await sequelize.query<{ count: string }>(
            `SELECT COUNT(*) AS count FROM (${base}) base`,
            { replacements, type: QueryTypes.SELECT },
        );
        const hasMore = rows.length > limit;
        return {
            sessionId,
            items: hasMore ? rows.slice(0, limit) : rows,
            nextCursor: hasMore ? encodeOffsetCursor(offset + limit) : null,
            total: Number(count),
            limit,
        };
    }
}
