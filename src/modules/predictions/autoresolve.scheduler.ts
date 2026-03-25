import { Op } from "sequelize";
import { logger } from "../../config/logger";
import { PredictionModel, PronosticModel, RaceSessionModel } from "../../database/models";
import { PredictionsService } from "./predictions.service";

const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

class AutoResolveScheduler {
    private timer: NodeJS.Timeout | null = null;
    private running = false;
    private readonly service = new PredictionsService();

    start(): void {
        if (this.timer) return;
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
        if (this.running) return; // prevent overlapping runs
        this.running = true;

        try {
            // Find predictions that:
            // - belong to a session that has already started (dateStart < now)
            // - have a valid OpenF1 session key
            // - still have at least one pronostic pending resolution
            const pending = await PredictionModel.findAll({
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
                        where: {
                            status: { [Op.in]: ["submitted", "awaiting_verification"] },
                        },
                        required: true,
                    },
                ],
            });

            if (pending.length === 0) return;

            logger.info(`AutoResolveScheduler: ${pending.length} prediction(s) to resolve`);

            for (const pred of pending) {
                try {
                    const result = await this.service.resolve(pred.id, {});
                    if (result.resolved > 0) {
                        logger.info(
                            { predictionId: pred.id, winningValue: result.winningValue, resolved: result.resolved },
                            "AutoResolveScheduler: prediction resolved",
                        );
                    } else if (result.awaiting > 0) {
                        logger.debug(
                            { predictionId: pred.id, awaiting: result.awaiting },
                            "AutoResolveScheduler: OpenF1 data not ready yet, will retry",
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
