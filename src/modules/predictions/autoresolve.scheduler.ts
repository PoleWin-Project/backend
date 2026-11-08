import { Op } from "sequelize";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { PredictionModel, PronosticModel, RaceSessionModel } from "../../database/models";
import { PredictionsService } from "./predictions.service";

const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

class AutoResolveScheduler {
    private timer: NodeJS.Timeout | null = null;
    private running = false;
    private readonly service = new PredictionsService();

    start(): void {
        if (this.timer) return;
        // Coupé pendant la fenêtre de bascule (AUTORESOLVE_ENABLED=false) pour que les
        // pronostics ouverts soient traités uniquement par le script de migration.
        if (!env.autoresolveEnabled) {
            logger.warn("AutoResolveScheduler disabled (AUTORESOLVE_ENABLED=false)");
            return;
        }
        logger.info("AutoResolveScheduler started (interval: 5 min)");
        void this.run();
        this.timer = setInterval(() => void this.run(), INTERVAL_MS);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            logger.info("AutoResolveScheduler stopped");
        }
    }

    private async run(): Promise<void> {
        // Verrou mémoire : évite deux passes simultanées dans CE process. Entre plusieurs
        // instances, c'est PredictionsService.resolve (verrou consultatif Postgres +
        // changement de statut conditionnel) qui garantit l'absence de double attribution.
        if (this.running) return;
        this.running = true;

        try {
            // Les prédictions provisoires/corrigées restent surveillées même quand tous
            // leurs pronostics sont déjà won/lost : une décision sportive tardive peut
            // encore modifier le classement officiel pendant 48 h.
            const pending = await PredictionModel.findAll({
                where: {
                    voidedAt: null,
                    resultStatus: { [Op.in]: ["pending", "provisional", "corrected"] },
                },
                include: [
                    {
                        model: RaceSessionModel,
                        as: "session",
                        where: {
                            dateStart:        { [Op.lt]: new Date() },
                            idCourseExternal: { [Op.ne]: null },
                        },
                        required: true,
                    },
                    {
                        model: PronosticModel,
                        as: "pronostics",
                        required: true,
                        attributes: [],
                    },
                ],
            });

            if (pending.length === 0) return;

            logger.info(`AutoResolveScheduler: ${pending.length} prediction(s) to resolve`);

            for (const pred of pending) {
                try {
                    const result = await this.service.resolve(pred.id, {});
                    if (result.resolved > 0 || result.corrected) {
                        logger.info(
                            {
                                predictionId: pred.id,
                                winningValue: result.winningValue,
                                resultStatus: result.resultStatus,
                                resolved: result.resolved,
                                corrected: result.corrected ?? false,
                            },
                            "AutoResolveScheduler: official result applied",
                        );
                    } else if (result.awaiting > 0) {
                        logger.debug(
                            {
                                predictionId: pred.id,
                                awaiting: result.awaiting,
                                candidateWinningValue: result.candidateWinningValue ?? null,
                            },
                            "AutoResolveScheduler: official result not confirmed yet, will retry",
                        );
                    }
                } catch (err) {
                    logger.warn({ predictionId: pred.id, err }, "AutoResolveScheduler: failed to resolve prediction");
                }
            }
        } catch (err) {
            logger.error({ err }, "AutoResolveScheduler: unexpected error");
        } finally {
            this.running = false;
        }
    }
}

export const autoResolveScheduler = new AutoResolveScheduler();
