import "./types/express";

import * as Sentry from "@sentry/node";
import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectToDatabase } from "./database/pg.client";
import { initModels } from "./database/models";
import { sequelize } from "./database/sequelize";
import { autoResolveScheduler } from "./modules/predictions/autoresolve.scheduler";
import { setupWsServer } from "./socket/ws.handler";
import { SessionsService } from "./modules/sessions/sessions.service";

if (env.sentryDsn) {
    Sentry.init({ dsn: env.sentryDsn, environment: env.nodeEnv });
    logger.info("Sentry initialized");
}

async function bootstrap() {
    await connectToDatabase();

    initModels(sequelize);

    await sequelize.authenticate();
    logger.info("Database connection established");

    const app        = createApp();
    const httpServer = createServer(app);

    // Native WebSocket server for real-time DMs
    setupWsServer(httpServer);
    logger.info("WebSocket server initialized on /ws");

    autoResolveScheduler.start();

    // Auto-sync sessions depuis OpenF1 si nécessaire (nouveau déploiement ou nouvelle année)
    (async () => {
        try {
            const sessionsService = new SessionsService();
            const { items, total } = await sessionsService.list({ upcoming: true, limit: 10, offset: 0 });
            const year = new Date().getFullYear();
            if (total < 10) {
                logger.info(`Auto-sync sessions OpenF1 (${total} sessions futures, année ${year})`);
                const result = await sessionsService.syncFromOpenF1(year);
                logger.info(result, "Sessions synced from OpenF1");
            } else {
                logger.info(`Sessions OK — ${total} sessions futures en BDD`);
            }
        } catch (err) {
            logger.warn({ err }, "Sessions auto-sync failed (non-bloquant)");
        }
    })();

    httpServer.listen(env.port, () => {
        logger.info(`Server listening on http://localhost:${env.port}`);
    });

    const shutdown = async (signal: string) => {
        logger.info(`${signal} received — graceful shutdown starting`);
        autoResolveScheduler.stop();
        httpServer.close(async () => {
            try {
                await sequelize.close();
                logger.info("Database connection closed");
                process.exit(0);
            } catch (err) {
                logger.error({ err }, "Error during shutdown");
                process.exit(1);
            }
        });
        setTimeout(() => {
            logger.error("Graceful shutdown timed out — forcing exit");
            process.exit(1);
        }, 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
    logger.error({ err }, "Bootstrap failed");
    process.exit(1);
});
