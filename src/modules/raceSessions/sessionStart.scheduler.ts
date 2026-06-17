import { Op } from "sequelize";
import { logger } from "../../config/logger";
import { RaceSessionModel } from "../../database/models";
import { broadcastToAll } from "../push/push.service";

const INTERVAL_MS = 2 * 60 * 1000; // toutes les 2 minutes
const LEAD_MS     = 10 * 60 * 1000; // prévenir jusqu'à 10 min avant le départ
const GRACE_MS    = 5 * 60 * 1000;  // tolérance si une session vient de démarrer

/**
 * Diffuse une notification push « début d'événement » lorsqu'une session de course
 * est sur le point de commencer. Chaque session n'est notifiée qu'une fois
 * (champ `startNotifiedAt`).
 */
class SessionStartScheduler {
    private timer: NodeJS.Timeout | null = null;
    private running = false;

    start(): void {
        if (this.timer) return;
        logger.info("SessionStartScheduler started (interval: 2 min)");
        void this.run();
        this.timer = setInterval(() => void this.run(), INTERVAL_MS);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            logger.info("SessionStartScheduler stopped");
        }
    }

    private async run(): Promise<void> {
        if (this.running) return;
        this.running = true;

        try {
            const now = Date.now();
            const sessions = await RaceSessionModel.findAll({
                where: {
                    startNotifiedAt: { [Op.is]: null },
                    dateStart: {
                        [Op.between]: [new Date(now - GRACE_MS), new Date(now + LEAD_MS)],
                    },
                },
            });

            if (sessions.length === 0) return;

            for (const session of sessions) {
                try {
                    const place = session.location ? ` à ${session.location}` : "";
                    await broadcastToAll({
                        title: `🏁 ${session.name}`,
                        body: `La session commence bientôt${place} — vérifie tes pronos !`,
                        data: { type: "session", sessionId: session.id },
                    });
                    await session.update({ startNotifiedAt: new Date() });
                    logger.info({ sessionId: session.id, name: session.name }, "SessionStartScheduler: start notified");
                } catch (err) {
                    logger.warn({ sessionId: session.id, err }, "SessionStartScheduler: failed to notify session");
                }
            }
        } catch (err) {
            logger.error({ err }, "SessionStartScheduler: unexpected error");
        } finally {
            this.running = false;
        }
    }
}

export const sessionStartScheduler = new SessionStartScheduler();
