import "./types/express";

import { createApp } from "./app";
import { env } from "./config/env";
import { connectToDatabase } from "./database/pg.client";
import { initModels } from "./database/models";
import { sequelize } from "./database/sequelize";

async function bootstrap() {
    await connectToDatabase();

    initModels(sequelize);

    await sequelize.authenticate();

    const [info] = await sequelize.query(
        "SELECT current_database() as db, current_schema() as schema, inet_server_addr() as host, inet_server_port() as port"
    );
    console.log("Sequelize connected to:", info);

    const [tables] = await sequelize.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema='public'
    ORDER BY table_name
  `);
    console.log("Public tables:", tables);

    const app = createApp();
    app.listen(env.port, () => {
        console.log(`Server listening on http://localhost:${env.port}`);
    });
}

bootstrap();
