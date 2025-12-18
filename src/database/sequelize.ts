import { Sequelize } from "sequelize";
import { env } from "../config/env";

if (!env.databaseUrl) {
    console.warn("DATABASE_URL is not set. Sequelize will not connect.");
}

export const sequelize = new Sequelize(env.databaseUrl, {
    dialect: "postgres",
    logging: env.nodeEnv === "development" ? console.log : false,
    define: { schema: "public" },
});
