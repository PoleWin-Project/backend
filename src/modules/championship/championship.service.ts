import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { SeasonScoreModel } from "../../database/models";
import { seasonsService } from "../seasons/seasons.service";

/**
 * Points de championnat — SEUL point d'écriture de `championship_score_events`
 * et de `season_scores`.
 *
 * Règles garanties ici et en base :
 *  - un pronostic correct crée UN événement positif (UNIQUE source_type/source_id) ;
 *  - un pronostic incorrect ne crée aucun événement et ne retire rien ;
 *  - il n'existe AUCUNE méthode de dépense : les points de championnat ne servent
 *    qu'au classement.
 */
export class ChampionshipService {
    /**
     * Enregistre le résultat d'un pronostic résolu. DOIT être appelé dans la
     * transaction qui a fait passer le pronostic à won/lost (et uniquement si ce
     * passage a effectivement eu lieu), pour que tout soit atomique.
     *
     * @returns true si des points ont été attribués par CET appel.
     */
    async recordPronosticResult(
        tx: Transaction,
        params: { seasonId: number; userId: number; pronosticId: number; points: number },
    ): Promise<boolean> {
        const { seasonId, userId, pronosticId, points } = params;

        // Ligne de classement créée à la volée (nouvel inscrit, nouvelle saison…).
        await sequelize.query(
            `INSERT INTO season_scores (season_id, user_id) VALUES (:seasonId, :userId)
             ON CONFLICT (season_id, user_id) DO NOTHING`,
            { replacements: { seasonId, userId }, transaction: tx },
        );

        let awarded = false;
        if (points > 0) {
            // ON CONFLICT DO NOTHING : si l'événement existe déjà (double résolution),
            // rien n'est inséré et on n'incrémente pas le score.
            const inserted = await sequelize.query<{ id: number }>(
                `INSERT INTO championship_score_events (season_id, user_id, source_type, source_id, points, reason)
                 VALUES (:seasonId, :userId, 'pronostic', :pronosticId, :points, 'correct_pronostic')
                 ON CONFLICT (source_type, source_id) DO NOTHING
                 RETURNING id`,
                {
                    replacements: { seasonId, userId, pronosticId, points },
                    type: QueryTypes.SELECT,
                    transaction: tx,
                },
            );
            awarded = inserted.length === 1;
        }

        // Mise à jour RELATIVE (pas de lire-puis-écrire) : aucune mise à jour perdue
        // même si deux résolutions du même utilisateur s'exécutent en parallèle.
        await sequelize.query(
            `UPDATE season_scores
                SET points         = points + :delta,
                    correct_count  = correct_count + :correctInc,
                    resolved_count = resolved_count + 1,
                    last_scored_at = CASE WHEN :delta > 0 THEN now() ELSE last_scored_at END,
                    updated_at     = now()
              WHERE season_id = :seasonId AND user_id = :userId`,
            {
                replacements: {
                    seasonId,
                    userId,
                    delta: awarded ? points : 0,
                    // Compteurs alignés sur les points réellement attribués par cet appel.
                    correctInc: awarded ? 1 : 0,
                },
                transaction: tx,
            },
        );

        return awarded;
    }

    /** Points de championnat d'un utilisateur dans la saison active (0 si aucune). */
    async getActiveSeasonScore(userId: number) {
        const season = await seasonsService.getActiveSeason();
        if (!season) return { season: null, points: 0, correctCount: 0, resolvedCount: 0 };
        const score = await SeasonScoreModel.findOne({ where: { seasonId: season.id, userId } });
        return {
            season: { id: season.id, code: season.code, name: season.name },
            points: score?.points ?? 0,
            correctCount: score?.correctCount ?? 0,
            resolvedCount: score?.resolvedCount ?? 0,
        };
    }

    /** Points de la saison active pour une liste d'utilisateurs (0 si absent). */
    async getActiveSeasonPoints(userIds: number[]): Promise<Map<number, number>> {
        const season = await seasonsService.getActiveSeason();
        if (!season || !userIds.length) return new Map();
        const rows = await SeasonScoreModel.findAll({
            where: { seasonId: season.id, userId: userIds },
            attributes: ["userId", "points"],
        });
        return new Map(rows.map((r) => [r.userId, r.points]));
    }

    /**
     * Contrôle d'intégrité : retourne les utilisateurs dont le cache `season_scores`
     * diverge de la somme des événements. Doit toujours renvoyer [] (rapport admin / tests).
     */
    findScoreDrifts(seasonId: number) {
        return sequelize.query<{ userId: number; cached: number; computed: number }>(
            `SELECT s.user_id AS "userId", s.points AS cached, COALESCE(e.total, 0)::int AS computed
               FROM season_scores s
               LEFT JOIN (SELECT user_id, SUM(points) AS total
                            FROM championship_score_events
                           WHERE season_id = :seasonId
                           GROUP BY user_id) e ON e.user_id = s.user_id
              WHERE s.season_id = :seasonId AND s.points <> COALESCE(e.total, 0)`,
            { replacements: { seasonId }, type: QueryTypes.SELECT },
        );
    }
}

export const championshipService = new ChampionshipService();
