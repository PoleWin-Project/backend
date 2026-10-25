import path from "path";
import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "./sequelize";

/**
 * Extension des fichiers de migration selon le mode d'exécution :
 *  - dev / tests (ts-node)  → les sources `.ts`
 *  - build compilé (`node dist/...`, cf. Dockerfile.prod) → les `.js` générés par tsc.
 *
 * Avant ce correctif, le glob ne cherchait que `*.ts` : dans `dist/` il ne trouvait
 * donc AUCUNE migration et `run-migrations.js up` ne faisait rien, silencieusement.
 */
const MIGRATION_EXT = path.extname(__filename) === ".js" ? "js" : "ts";

export const migrator = new Umzug({
    migrations: {
        glob: path.join(__dirname, "migrations", `*.${MIGRATION_EXT}`).replace(/\\/g, "/"),
        // Les migrations déjà exécutées sont enregistrées dans SequelizeMeta avec
        // leur nom `.ts` (ex. "2025010100-initial-schema.ts"). On normalise le nom
        // en `.ts` quel que soit le mode, sinon le build compilé considérerait
        // toutes les migrations comme nouvelles et tenterait de les rejouer.
        resolve: ({ name, path: filePath, context }) => {
            const normalizedName = name.replace(/\.js$/, ".ts");
            return {
                name: normalizedName,
                up: async () => (await import(filePath!)).up({ context }),
                down: async () => (await import(filePath!)).down({ context }),
            };
        },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
});
