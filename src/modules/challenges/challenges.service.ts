import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { isChampionshipMode } from "../../config/env";
import { httpErrors } from "../../common/errors/http";
import { GarageTransactionModel } from "../../database/models";
import { garageService } from "../garage/garage.service";

export function weekWindow(now = new Date()) {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    const end = new Date(start.getTime() + 7 * 86400000);
    return { start, end, key: start.toISOString().slice(0, 10) };
}

export const WEEKLY_CHALLENGES = [
    { id: "reaction", title: "Feux éteints !", description: "Termine 5 Reaction Tests sans faux départ.", target: 5, reward: 75 },
    { id: "drivers", title: "Expert de la grille", description: "Trouve le pilote du jour sur 2 jours différents.", target: 2, reward: 100 },
    { id: "regular", title: "Rythme de course", description: "Termine un mini-jeu avec une récompense sur 3 jours différents.", target: 3, reward: 75 },
    { id: "prono", title: "Sur la grille", description: "Conserve un prono jusqu’au départ d’une session cette semaine, quel que soit le résultat.", target: 1, reward: 100 },
] as const;

type Metrics = { reaction: number; drivers: number; regular: number; prono: number; sessions: number };
const claimKey = (userId: number, week: string, id: string) => `weekly:v1:${week}:${id}:${userId}`;

export class ChallengesService {
    private async metrics(userId: number, now: Date, tx?: Transaction) {
        const { start, end } = weekWindow(now);
        const [row] = await sequelize.query<Metrics>(`
            SELECT
              (SELECT COUNT(*)::int FROM game_plays WHERE user_id = :userId AND game_id = 'reaction'
                AND points > 0 AND metric_ms IS NOT NULL AND played_at >= :start AND played_at < :end AND played_at <= :now) AS reaction,
              (SELECT COUNT(DISTINCT (played_at AT TIME ZONE 'UTC')::date)::int FROM game_plays
                WHERE user_id = :userId AND game_id = 'driver-dle' AND points > 0
                  AND played_at >= :start AND played_at < :end AND played_at <= :now) AS drivers,
              (SELECT COUNT(DISTINCT (played_at AT TIME ZONE 'UTC')::date)::int FROM game_plays
                WHERE user_id = :userId AND game_id IN ('reaction', 'driver-dle') AND points > 0
                  AND played_at >= :start AND played_at < :end AND played_at <= :now) AS regular,
              (SELECT COUNT(*)::int FROM pronostics p JOIN predictions d ON d.id = p.prediction_id
                WHERE p.user_id = :userId AND p.scoring_model = 'fixed_reward'
                  AND p.status IN ('submitted', 'awaiting_verification', 'won', 'lost')
                  AND p.submitted_at <= d.closes_at AND d.voided_at IS NULL
                  AND d.closes_at >= :start AND d.closes_at < :end AND d.closes_at <= :now) AS prono,
              (SELECT COUNT(*)::int FROM predictions WHERE voided_at IS NULL
                AND closes_at >= :start AND closes_at < :end) AS sessions`,
            { replacements: { userId, start, end, now }, type: QueryTypes.SELECT, transaction: tx });
        return row;
    }

    async list(userId: number, now = new Date()) {
        const { key, end } = weekWindow(now);
        if (!isChampionshipMode()) return { enabled: false, week: key, endsAt: end, items: [] };
        const [metrics, claims] = await Promise.all([
            this.metrics(userId, now),
            GarageTransactionModel.findAll({ where: { userId, idempotencyKey: WEEKLY_CHALLENGES.map(c => claimKey(userId, key, c.id)) } }),
        ]);
        const claimed = new Set(claims.map(c => c.idempotencyKey));
        return {
            enabled: true, week: key, endsAt: end,
            items: WEEKLY_CHALLENGES.filter(c => c.id !== "prono" || metrics.sessions > 0 || claimed.has(claimKey(userId, key, c.id))).map(c => {
                const collected = claimed.has(claimKey(userId, key, c.id));
                const progress = collected ? c.target : Math.min(c.target, metrics[c.id]);
                return { ...c, progress, claimed: collected, completed: progress >= c.target };
            }),
        };
    }

    async claim(userId: number, id: string, week: string) {
        if (!isChampionshipMode()) throw httpErrors.conflict("Les défis seront disponibles au lancement du championnat.");
        const challenge = WEEKLY_CHALLENGES.find(c => c.id === id);
        if (!challenge) throw httpErrors.notFound("Défi inconnu");
        return sequelize.transaction(async tx => {
            // Same lock as mini-games: serializes claims and their progress writes per user.
            await sequelize.query("SELECT id FROM users WHERE id = :userId FOR UPDATE", { replacements: { userId }, transaction: tx });
            const now = new Date();
            if (week !== weekWindow(now).key) throw httpErrors.conflict("Cette semaine est terminée. Actualise les défis.", "CHALLENGE_EXPIRED");
            const idempotencyKey = claimKey(userId, week, id);
            const existing = await GarageTransactionModel.findOne({ where: { userId, idempotencyKey }, transaction: tx });
            if (!existing) {
                const metrics = await this.metrics(userId, now, tx);
                if (metrics[challenge.id] < challenge.target) throw httpErrors.conflict("Ce défi n’est pas encore terminé.", "CHALLENGE_INCOMPLETE");
            }
            const result = await garageService.applyMovement({
                userId, amount: challenge.reward, kind: "mission", idempotencyKey,
                referenceType: "weekly_challenge", referenceId: `${week}:${id}`,
                metadata: { week, challengeId: id, version: 1 },
            }, tx);
            return { rewarded: result.duplicated ? 0 : challenge.reward, garageCredits: result.balance, claimed: true };
        });
    }
}
export const challengesService = new ChallengesService();
