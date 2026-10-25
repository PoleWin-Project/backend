import { Transaction } from "sequelize";
import { logger } from "../../config/logger";
import { PredictionModel, PredictionRewardOptionModel } from "../../database/models";
import { OpenF1Service } from "../openf1/openf1.service";
import {
    buildRewardOptions,
    DRIVER_PREDICTION_TYPES,
    DriverStandingInput,
    REWARD_RULE_VERSION,
} from "./rewardScale";

const STANDINGS_TTL_MS = 60 * 60 * 1000; // 1 h : le classement ne bouge qu'après une session

/**
 * Génère et lit le barème de récompense d'une prédiction.
 *
 * Le barème est FIGÉ à sa première génération : les insertions utilisent
 * `ignoreDuplicates` sur l'index unique (prediction_id, option_value), donc deux
 * générations concurrentes ne peuvent pas produire deux barèmes différents et une
 * régénération ultérieure ne modifie jamais un barème existant.
 */
export class RewardOptionsService {
    private standingsCache = new Map<number, { at: number; data: DriverStandingInput[] }>();

    constructor(private readonly openf1 = new OpenF1Service()) {}

    /** Classement pilotes de l'année (mis en cache) ; [] si l'API est indisponible. */
    private async getStandings(year: number): Promise<DriverStandingInput[]> {
        const cached = this.standingsCache.get(year);
        if (cached && Date.now() - cached.at < STANDINGS_TTL_MS) return cached.data;

        const raw = await this.openf1.getDriverStandings(year);
        const data: DriverStandingInput[] = raw
            .map((s: any) => ({ acronym: s.driver?.name_acronym, position: Number(s.position) }))
            .filter((s: DriverStandingInput) => !!s.acronym && Number.isFinite(s.position));

        // On ne met pas en cache un échec, pour retenter au prochain appel.
        if (data.length) this.standingsCache.set(year, { at: Date.now(), data });
        return data;
    }

    findForPrediction(predictionId: number, tx?: Transaction) {
        return PredictionRewardOptionModel.findAll({
            where: { predictionId },
            order: [["rewardPoints", "ASC"], ["optionValue", "ASC"]],
            transaction: tx,
        });
    }

    /**
     * Retourne le barème de la prédiction, en le générant s'il n'existe pas encore.
     * Appelé à l'affichage des prédictions et à la validation d'un pronostic.
     */
    async ensureForPrediction(prediction: PredictionModel): Promise<PredictionRewardOptionModel[]> {
        const existing = await this.findForPrediction(prediction.id);
        if (existing.length) return existing;

        const needsStandings = (DRIVER_PREDICTION_TYPES as readonly string[]).includes(prediction.type)
            && prediction.type !== "DNF";
        // Classement de l'année de la session (à défaut, de la date de clôture / de l'année en cours).
        const refDate = prediction.session?.dateStart ?? prediction.closesAt ?? new Date();
        const standings = needsStandings ? await this.getStandings(new Date(refDate).getFullYear()) : [];

        const drafts = buildRewardOptions(prediction.type, standings);
        if (needsStandings && !standings.length) {
            logger.warn({ predictionId: prediction.id }, "Reward scale: driver standings unavailable, fallback scale used");
        }

        await PredictionRewardOptionModel.bulkCreate(
            drafts.map((d) => ({
                predictionId: prediction.id,
                optionValue: d.optionValue,
                rewardPoints: d.rewardPoints,
                partialRewardPoints: d.partialRewardPoints,
                ruleVersion: REWARD_RULE_VERSION,
                computedFrom: d.computedFrom,
            })),
            { ignoreDuplicates: true },
        );
        // Ne renseigne la version que si elle est vide (premier générateur gagnant).
        await PredictionModel.update(
            { rewardRuleVersion: REWARD_RULE_VERSION },
            { where: { id: prediction.id, rewardRuleVersion: null } },
        );

        return this.findForPrediction(prediction.id);
    }
}

export const rewardOptionsService = new RewardOptionsService();
