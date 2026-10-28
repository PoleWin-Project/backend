import { DataTypes, QueryInterface, literal } from "sequelize";

// NB : `defaultValue: DataTypes.NOW` ne crée PAS de DEFAULT côté Postgres (Sequelize
// l'applique seulement côté JS). Ces tables étant aussi alimentées en SQL brut
// (script de bascule, upserts), on pose un vrai DEFAULT now() en base.
const DB_NOW = literal("now()");

/**
 * Migration « no simulated gambling » — étape 1/4 (ADDITIVE).
 *
 * Crée la notion de saison : les points de championnat sont comptés par saison
 * et la « Saison Bêta » (ancien modèle à mises) sera archivée comme une saison.
 * Aucune saison n'est insérée ici : c'est le script de bascule
 * (scripts/migrate-beta-season.ts) qui crée la Saison Bêta et la saison active.
 *
 * Les colonnes `season_id` ajoutées sont NULLABLES : les données existantes
 * restent valides et l'ancien code continue de fonctionner sans les renseigner.
 */
export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.createTable("seasons", {
        id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        // Identifiant stable lisible : 'beta', '2026', '2027'…
        code:        { type: DataTypes.STRING(32), allowNull: false, unique: true },
        name:        { type: DataTypes.STRING(100), allowNull: false },
        // upcoming → active → archived (une seule saison active, cf. index partiel)
        status:      { type: DataTypes.STRING(16), allowNull: false },
        starts_at:   { type: DataTypes.DATE, allowNull: false },
        ends_at:     { type: DataTypes.DATE, allowNull: true },
        archived_at: { type: DataTypes.DATE, allowNull: true },
        created_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: DB_NOW },
    });

    await queryInterface.sequelize.query(`
        ALTER TABLE seasons
            ADD CONSTRAINT seasons_status_check
            CHECK (status IN ('upcoming', 'active', 'archived'));
    `);

    // Au plus UNE saison active à la fois (index unique partiel).
    await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX seasons_single_active ON seasons ((status)) WHERE status = 'active';
    `);

    await queryInterface.addColumn("race_sessions", "season_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "seasons", key: "id" },
        onDelete: "SET NULL",
    });

    await queryInterface.addColumn("predictions", "season_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "seasons", key: "id" },
        onDelete: "SET NULL",
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeColumn("predictions", "season_id");
    await queryInterface.removeColumn("race_sessions", "season_id");
    await queryInterface.dropTable("seasons");
}
