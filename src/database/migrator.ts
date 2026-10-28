import path from "path";
import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "./sequelize";

export const migrator = new Umzug({
    migrations: {
        glob: path.join(__dirname, "migrations", `*${path.extname(__filename)}`).replace(/\\/g, "/"),
        resolve: (params) => ({
            ...Umzug.defaultResolver(params),
            name: `${path.parse(params.name).name}.ts`,
        }),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
});
