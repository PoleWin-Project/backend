import { Op, QueryTypes, Transaction } from "sequelize";
import { GamePlayModel, ProfileModel } from "../../database/models";
import { httpErrors } from "../../common/errors/http";
import { sequelize } from "../../database/sequelize";
import { isChampionshipMode } from "../../config/env";
import { garageService } from "../garage/garage.service";

const DEFAULT_DAILY_LIMIT = 3;

/**
 * Liste blanche des mini-jeux. Avant ce correctif, `gameId` était une chaîne libre
 * envoyée par le client et le quota journalier était compté PAR gameId : inventer un
 * nouveau gameId permettait de se créditer des points sans limite.
 */
export const KNOWN_GAMES = ["reaction", "driver-dle"] as const;
export type GameId = (typeof KNOWN_GAMES)[number];

/**
 * Jeux dont la récompense peut être réclamée via POST /games/reward.
 * driver-dle n'en fait PAS partie : sa récompense est attribuée exclusivement par
 * DriverDleService à partir de la partie jouée côté serveur.
 */
export const CLIENT_CLAIMABLE_GAMES: readonly GameId[] = ["reaction"];

/** Plafond de sécurité par partie (aucun barème ne le dépasse). */
export const MAX_REWARD_PER_GAME = 100;

export function isKnownGame(gameId: unknown): gameId is GameId {
    return typeof gameId === "string" && (KNOWN_GAMES as readonly string[]).includes(gameId);
}

/**
 * Barème du Reaction Test, déplacé du client (app/games/reaction-test.tsx) vers le
 * serveur : le client n'envoie plus que son temps de réaction, plus le montant.
 * Interpolation linéaire entre les paliers (temps en ms → points).
 * NB : le temps reste déclaré par le client (non vérifiable) : c'est pourquoi les
 * mini-jeux ne rapportent que des crédits Garage cosmétiques en mode championship,
 * jamais des points de championnat.
 */
const REACTION_KEYFRAMES: [number, number][] = [
    [0,   50],
    [50,  35],
    [100, 20],
    [200, 10],
    [300,  5],
    [500,  2],
];

export function reactionPointsFor(ms: number): number {
    if (ms <= 0)   return 50;
    if (ms >= 500) return 2;
    for (let i = 0; i < REACTION_KEYFRAMES.length - 1; i++) {
        const [t0, v0] = REACTION_KEYFRAMES[i];
        const [t1, v1] = REACTION_KEYFRAMES[i + 1];
        if (ms >= t0 && ms < t1) {
            const t = (ms - t0) / (t1 - t0);
            return Math.round(v0 + t * (v1 - v0));
        }
    }
    return 2;
}

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
     * Verrouille la ligne `users` du joueur pour la durée de la transaction : les
     * vérifications de quota + insertions d'un même joueur sont ainsi sérialisées
     * (deux requêtes parallèles ne peuvent plus dépasser le quota journalier).
     */
    private async lockPlayer(userId: number, tx: Transaction) {
        await sequelize.query(`SELECT id FROM users WHERE id = :userId FOR UPDATE`, {
            replacements: { userId },
            transaction: tx,
        });
    }

    private async assertQuota(userId: number, gameId: GameId, isAdmin: boolean, tx: Transaction) {
        if (isAdmin) return; // les admins gardent un accès illimité (tests en local / démo)
        const dailyLimit = getDailyLimit(gameId);
        const played = await GamePlayModel.count({
            where: { userId, gameId, playedAt: { [Op.gte]: startOfTodayUTC() } },
            transaction: tx,
        });
        if (played >= dailyLimit) {
            throw httpErrors.forbidden(
                `Limite journalière atteinte (${dailyLimit} parties/jour). Reviens demain !`
            );
        }
    }

    /**
     * Enregistre un faux départ : compte comme une partie (décompte le quota
     * journalier) mais ne rapporte aucun point et n'entre pas au classement.
     * Empêche les joueurs de relancer à l'infini pour "pre-shoot" le vert.
     */
    async recordFalseStart(userId: number, gameId: string, isAdmin: boolean) {
        if (!isKnownGame(gameId)) throw httpErrors.badRequest("Unknown game");
        const dailyLimit = getDailyLimit(gameId);

        await sequelize.transaction(async (tx) => {
            await this.lockPlayer(userId, tx);
            await this.assertQuota(userId, gameId, isAdmin, tx);
            await GamePlayModel.create(
                { userId, gameId, points: 0, metricMs: null, playedAt: new Date() },
                { transaction: tx },
            );
        });

        const playsToday = await this.countPlaysToday(userId, gameId);
        return {
            playsToday,
            playsLeft: isAdmin ? null : dailyLimit - playsToday,
        };
    }

    /**
     * Point d'entrée de la route publique POST /games/reward.
     * Le client n'envoie QUE `gameId` et `metricMs` : le montant est calculé ici.
     * Un éventuel champ `points` envoyé par un ancien client est ignoré.
     */
    async claimReward(userId: number, gameId: unknown, metricMs: unknown, isAdmin: boolean) {
        if (!isKnownGame(gameId) || !CLIENT_CLAIMABLE_GAMES.includes(gameId)) {
            throw httpErrors.badRequest("Unknown or non-claimable game");
        }
        if (typeof metricMs !== "number" || !Number.isInteger(metricMs) || metricMs < 0 || metricMs > 60_000) {
            throw httpErrors.badRequest("Invalid metricMs");
        }
        return this.rewardUser(userId, reactionPointsFor(metricMs), gameId, isAdmin, metricMs);
    }

    /**
     * Enregistre une partie gagnante et crédite la récompense.
     * ⚠️ USAGE INTERNE UNIQUEMENT (montant déjà calculé côté serveur) : claimReward,
     * DriverDleService. Ne jamais l'exposer avec un montant venant du client.
     *
     * Destination de la récompense :
     *  - mode legacy       : profiles.points (comportement historique) ;
     *  - mode championship : crédits Garage (cosmétiques). Les mini-jeux ne donnent
     *    JAMAIS de points de championnat.
     */
    async rewardUser(userId: number, points: number, gameId: string, isAdmin: boolean, metricMs?: number | null) {
        if (!isKnownGame(gameId)) throw httpErrors.badRequest("Unknown game");
        if (!Number.isInteger(points) || points <= 0) throw httpErrors.badRequest("Invalid points amount");
        if (points > MAX_REWARD_PER_GAME) throw httpErrors.badRequest("Max reward per game exceeded");

        const dailyLimit = getDailyLimit(gameId);
        const championship = isChampionshipMode();

        const result = await sequelize.transaction(async (tx) => {
            await this.lockPlayer(userId, tx);
            await this.assertQuota(userId, gameId, isAdmin, tx);

            const play = await GamePlayModel.create(
                { userId, gameId, points, metricMs: metricMs ?? null, playedAt: new Date() },
                { transaction: tx },
            );

            if (championship) {
                const { balance } = await garageService.applyMovement(
                    {
                        userId,
                        amount: points,
                        kind: "minigame",
                        // Une partie = un crédit, au plus.
                        idempotencyKey: `minigame:${play.id}`,
                        referenceType: "game_play",
                        referenceId: String(play.id),
                        metadata: { gameId },
                    },
                    tx,
                );
                return { newTotal: balance, currency: "garage_credits" as const };
            }

            // [MODÈLE LEGACY] incrément relatif (pas de lire-puis-écrire).
            const profile = await ProfileModel.findOne({ where: { userId }, transaction: tx, lock: tx.LOCK.UPDATE });
            if (!profile) throw httpErrors.notFound("Profile not found");
            await profile.update({ points: profile.points + points }, { transaction: tx });
            return { newTotal: profile.points, currency: "legacy_points" as const };
        });

        const playsToday = await this.countPlaysToday(userId, gameId);
        return {
            ...result,
            rewarded:   points,
            playsToday,
            playsLeft:  dailyLimit - playsToday,
            message:    championship
                ? `Bravo ! +${points} Jetons Paddock.`
                : `Bravo ! Vous avez gagné ${points} points au Garage.`,
        };
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
