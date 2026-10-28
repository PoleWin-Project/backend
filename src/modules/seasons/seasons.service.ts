import { Op, QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { SeasonFinalStandingModel, SeasonModel } from "../../database/models";

/** Code de la saison archivée qui regroupe l'ancien modèle à mises. */
export const BETA_SEASON_CODE = "beta";

interface SeasonHistoryEntry {
    seasonCode: string;
    seasonName: string;
    rank: number | null;
    participants: number | null;
    stats: Record<string, unknown>;
}

/**
 * Accès aux saisons de championnat. Lecture seule ici : la création / l'archivage
 * des saisons est réalisé par le script de bascule (et plus tard par une route admin).
 */
export class SeasonsService {
    /** Saison en cours (null si aucune : le mode championship n'est pas encore initialisé). */
    getActiveSeason(tx?: Transaction) {
        return SeasonModel.findOne({ where: { status: "active" }, transaction: tx });
    }

    listSeasons() {
        return SeasonModel.findAll({ order: [["startsAt", "DESC"]] });
    }

    getByCode(code: string) {
        return SeasonModel.findOne({ where: { code } });
    }

    /** Archives personnelles, de la saison la plus récente à la plus ancienne. */
    async getHistory(userId: number) {
        const seasons = await SeasonModel.findAll({
            where: { status: "archived" },
            order: [["startsAt", "DESC"], ["id", "DESC"]],
        });
        if (!seasons.length) return [];
        const standings = await SeasonFinalStandingModel.findAll({
            where: { userId, seasonId: { [Op.in]: seasons.map(season => season.id) } },
        });
        const bySeason = new Map(standings.map(standing => [standing.seasonId, standing]));
        // Les administrateurs étaient exclus du classement bêta, mais leurs
        // pronostics personnels restent dans le snapshot immuable de bascule.
        const beta = seasons.find(season => season.code === BETA_SEASON_CODE);
        const personalBetaStats = beta && !bySeason.has(beta.id)
            ? await this.getUnrankedBetaStats(userId) : null;
        return seasons.flatMap<SeasonHistoryEntry>(season => {
            const standing = bySeason.get(season.id);
            if (!standing && season.code === BETA_SEASON_CODE && personalBetaStats) {
                return [{ seasonCode: season.code, seasonName: season.name,
                    rank: null, participants: null, stats: personalBetaStats }];
            }
            if (!standing) return [];
            return [{
                seasonCode: season.code,
                seasonName: season.name,
                rank: standing.finalRank,
                participants: standing.participants,
                stats: standing.stats,
            }];
        });
    }

    private async getUnrankedBetaStats(userId: number) {
        const [tables] = await sequelize.query<{ profiles: string | null; pronostics: string | null }>(
            `SELECT to_regclass('public.migration_beta_snapshot_profiles')::text AS profiles,
                    to_regclass('public.migration_beta_snapshot_pronostics')::text AS pronostics`,
            { type: QueryTypes.SELECT },
        );
        if (!tables?.profiles || !tables.pronostics) return null;
        const [stats] = await sequelize.query<{ correct: number; incorrect: number; resolved: number }>(
            `SELECT COUNT(p.id) FILTER (WHERE p.status = 'won')::int AS correct,
                    COUNT(p.id) FILTER (WHERE p.status = 'lost')::int AS incorrect,
                    COUNT(p.id) FILTER (WHERE p.status IN ('won', 'lost'))::int AS resolved
               FROM public.migration_beta_snapshot_profiles profile
               LEFT JOIN public.migration_beta_snapshot_pronostics p ON p.user_id = profile.user_id
              WHERE profile.user_id = :userId
              GROUP BY profile.user_id`,
            { replacements: { userId }, type: QueryTypes.SELECT },
        );
        return stats ?? null;
    }

    /**
     * Résultat d'un utilisateur dans la Saison Bêta (archive figée), ou null s'il
     * n'y a pas participé. Utilisé par le profil.
     */
    async getBetaResult(userId: number) {
        const beta = await this.getByCode(BETA_SEASON_CODE);
        if (!beta) return null;
        const standing = await SeasonFinalStandingModel.findOne({
            where: { seasonId: beta.id, userId },
        });
        if (!standing) return null;
        return {
            seasonCode: beta.code,
            seasonName: beta.name,
            rank: standing.finalRank,
            participants: standing.participants,
            stats: standing.stats,
        };
    }
}

export const seasonsService = new SeasonsService();
