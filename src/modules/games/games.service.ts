import { Op, QueryTypes } from "sequelize";
import { GamePlayModel, ProfileModel } from "../../database/models";
import { httpErrors } from "../../common/errors/http";
import { sequelize } from "../../database/sequelize";

const DEFAULT_DAILY_LIMIT = 3;

/**
 * Quota journalier par mini-jeu. Défaut à 3 parties/jour ;
 * certains jeux (ex. DriverDle façon Wordle) n'autorisent qu'une partie/jour.
 */
const DAILY_LIMITS: Record<string, number> = {
    "driver-dle": 1,
};

export function getDailyLimit(gameId: string): number {
    return DAILY_LIMITS[gameId] ?? DEFAULT_DAILY_LIMIT;
}

const LEADERBOARD_SIZE = 50;

export interface LeaderboardRow {
    userId:      number;
    displayName: string | null;
    avatarUrl:   string | null;
    bestMs:      number;
}

function startOfTodayUTC(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

function getLastFridayMidnightUTC(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0); // Start of today (UTC)
    const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const diff = (day + 7 - 5) % 7; // Days since last Friday
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
}

export class GamesService {

    async countPlaysToday(userId: number, gameId: string): Promise<number> {
        return GamePlayModel.count({
            where: {
                userId,
                gameId,
                playedAt: { [Op.gte]: startOfTodayUTC() },
            },
        });
    }

    async getPlaysToday(userId: number, gameId: string, isAdmin: boolean) {
        const played = await this.countPlaysToday(userId, gameId);
        return {
            played,
            limit: isAdmin ? null : getDailyLimit(gameId),
        };
    }

    /**
     * Enregistre un faux départ : compte comme une partie (décompte le quota
     * journalier) mais ne rapporte aucun point et n'entre pas au classement.
     * Empêche les joueurs de relancer à l'infini pour "pre-shoot" le vert.
     */
    async recordFalseStart(userId: number, gameId: string, isAdmin: boolean) {
        const dailyLimit = getDailyLimit(gameId);
        if (!isAdmin) {
            const played = await this.countPlaysToday(userId, gameId);
            if (played >= dailyLimit) {
                throw httpErrors.forbidden(
                    `Limite journalière atteinte (${dailyLimit} parties/jour). Reviens demain !`
                );
            }
        }

        await GamePlayModel.create({
            userId,
            gameId,
            points: 0,
            metricMs: null,
            playedAt: new Date(),
        });

        const playsToday = await this.countPlaysToday(userId, gameId);
        return {
            playsToday,
            playsLeft: isAdmin ? null : dailyLimit - playsToday,
        };
    }

    async rewardUser(userId: number, points: number, gameId: string, isAdmin: boolean, metricMs?: number | null) {
        if (points <= 0)   throw httpErrors.badRequest("Invalid points amount");
        if (points > 100)  throw httpErrors.badRequest("Max reward per game exceeded");

        const dailyLimit = getDailyLimit(gameId);
        if (!isAdmin) {
            const played = await this.countPlaysToday(userId, gameId);
            if (played >= dailyLimit) {
                throw httpErrors.forbidden(
                    `Limite journalière atteinte (${dailyLimit} parties/jour). Reviens demain !`
                );
            }
        }

        return sequelize.transaction(async (tx) => {
            const profile = await ProfileModel.findOne({
                where: { userId },
                transaction: tx,
            });
            if (!profile) throw httpErrors.notFound("Profile not found");

            await Promise.all([
                profile.update({ points: profile.points + points }, { transaction: tx }),
                GamePlayModel.create(
                    { userId, gameId, points, metricMs: metricMs ?? null, playedAt: new Date() },
                    { transaction: tx }
                ),
            ]);

            const playsToday = await this.countPlaysToday(userId, gameId);

            return {
                newTotal:   profile.points + points,
                rewarded:   points,
                playsToday,
                playsLeft:  dailyLimit - playsToday,
                message:    `Bravo ! Vous avez gagné ${points} points au Garage.`,
            };
        });
    }

    /**
     * Classement d'un mini-jeu : meilleur (plus petit) temps de réaction
     * par utilisateur, du plus rapide au plus lent.
     */
    async getLeaderboard(gameId: string, currentUserId: number, limit = LEADERBOARD_SIZE) {
        const lastReset = getLastFridayMidnightUTC();

        const top = await sequelize.query<LeaderboardRow>(
            `SELECT gp.user_id        AS "userId",
                    pr.display_name   AS "displayName",
                    pr.avatar_url     AS "avatarUrl",
                    MIN(gp.metric_ms) AS "bestMs"
               FROM game_plays gp
               JOIN profiles pr ON pr.user_id = gp.user_id
              WHERE gp.game_id = :gameId
                AND gp.metric_ms IS NOT NULL
                AND gp.played_at >= :lastReset
              GROUP BY gp.user_id, pr.display_name, pr.avatar_url
              ORDER BY "bestMs" ASC
              LIMIT :limit`,
            {
                type: QueryTypes.SELECT,
                replacements: { gameId, limit, lastReset },
            }
        );

        const entries = top.map((row, i) => ({
            rank:        i + 1,
            userId:      Number(row.userId),
            displayName: row.displayName,
            avatarUrl:   row.avatarUrl,
            bestMs:      Number(row.bestMs),
            isMe:        Number(row.userId) === currentUserId,
        }));

        // Rang de l'utilisateur courant même s'il est hors du top affiché
        let me = entries.find((e) => e.isMe) ?? null;
        if (!me) {
            const [best] = await sequelize.query<{ bestMs: number }>(
                `SELECT MIN(metric_ms) AS "bestMs"
                   FROM game_plays
                  WHERE game_id = :gameId AND user_id = :userId AND metric_ms IS NOT NULL AND played_at >= :lastReset`,
                { type: QueryTypes.SELECT, replacements: { gameId, userId: currentUserId, lastReset } }
            );
            if (best?.bestMs != null) {
                const [{ ahead }] = await sequelize.query<{ ahead: number }>(
                    `SELECT COUNT(*) AS "ahead" FROM (
                        SELECT user_id, MIN(metric_ms) AS best
                          FROM game_plays
                         WHERE game_id = :gameId AND metric_ms IS NOT NULL AND played_at >= :lastReset
                         GROUP BY user_id
                     ) t WHERE t.best < :bestMs`,
                    { type: QueryTypes.SELECT, replacements: { gameId, bestMs: best.bestMs, lastReset } }
                );
                me = {
                    rank:        Number(ahead) + 1,
                    userId:      currentUserId,
                    displayName: null,
                    avatarUrl:   null,
                    bestMs:      Number(best.bestMs),
                    isMe:        true,
                };
            }
        }

        return { entries, me };
    }
}
