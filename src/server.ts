import "./types/express";

import * as Sentry from "@sentry/node";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectToDatabase } from "./database/pg.client";
import { initModels } from "./database/models";
import { sequelize } from "./database/sequelize";
import { autoResolveScheduler } from "./modules/predictions/autoresolve.scheduler";

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

    autoResolveScheduler.start();

    const server = app.listen(env.port, () => {
        logger.info(`Server listening on http://localhost:${env.port}`);
    });

    const shutdown = async (signal: string) => {
        logger.info(`${signal} received — graceful shutdown starting`);
        autoResolveScheduler.stop();
        server.close(async () => {
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
