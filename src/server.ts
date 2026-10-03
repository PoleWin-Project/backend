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
import { sessionStartScheduler } from "./modules/raceSessions/sessionStart.scheduler";
import { setupWsServer } from "./socket/ws.handler";
import { getSessionsService } from "./modules/sessions/sessions.service";

if (env.sentryDsn) {
    Sentry.init({ dsn: env.sentryDsn, environment: env.nodeEnv });
    logger.info("Sentry initialized");
}

async function bootstrap() {
    await connectToDatabase();

    initModels(sequelize);

    await sequelize.authenticate();
    logger.info("Database connection established");

    const app = createApp();
    const httpServer = createServer(app);

    // Native WebSocket server for real-time DMs
    setupWsServer(httpServer);
    logger.info("WebSocket server initialized on /ws");

    autoResolveScheduler.start();
    sessionStartScheduler.start();

    // Refresh even when the database already contains a full season: dates can change.
    void getSessionsService().list({ upcoming: true, limit: 1, offset: 0 })
        .catch(err => logger.warn({ err }, "Initial calendar refresh failed"));

    httpServer.listen(env.port, () => {
        logger.info(`Server listening on http://localhost:${env.port}`);

        // Auto-ping pour empêcher la mise en veille sur Render 
        // S'exécute toutes les 10 minutes si une URL publique est détectée
        const renderUrl = process.env.RENDER_EXTERNAL_URL;
        if (renderUrl) {
            logger.info(`Auto-ping activé sur ${renderUrl} (toutes les 10 min)`);
            setInterval(() => {
                fetch(`${renderUrl}/health`).catch(() => { });
            }, 10 * 60 * 1000);
        }
    });

    const shutdown = async (signal: string) => {
        logger.info(`${signal} received — graceful shutdown starting`);
        autoResolveScheduler.stop();
        sessionStartScheduler.stop();
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
    process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
    logger.error({ err }, "Bootstrap failed");
    process.exit(1);
});
