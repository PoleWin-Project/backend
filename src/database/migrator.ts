import path from "path";
import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "./sequelize";

export const migrator = new Umzug({
    migrations: {
        glob: path.join(__dirname, "migrations", "*.ts").replace(/\\/g, "/"),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
});
