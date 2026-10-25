import { DataTypes, QueryInterface, literal } from "sequelize";

// NB : `defaultValue: DataTypes.NOW` ne crée PAS de DEFAULT côté Postgres (Sequelize
// l'applique seulement côté JS). Ces tables étant aussi alimentées en SQL brut
// (script de bascule, upserts), on pose un vrai DEFAULT now() en base.
const DB_NOW = literal("now()");

/**
 * Migration « no simulated gambling » — étape 2/4 (ADDITIVE).
 *
 * Nouveau modèle de score SANS MISE :
 *  - `prediction_reward_options` : récompense fixe par option (ex. HAM = 100, STR = 300),
 *    calculée côté serveur et figée par prédiction (versionnée par `rule_version`).
 *  - colonnes ajoutées à `pronostics` : la récompense est SNAPSHOTÉE au moment de la
 *    validation (`reward_points_snapshot`) pour qu'un changement de barème ne modifie
 *    jamais rétroactivement les points attribués.
 *  - `championship_score_events` : journal append-only des points de championnat.
 *    La contrainte UNIQUE (source_type, source_id) garantit qu'un pronostic ne peut
 *    rapporter des points qu'UNE seule fois, même en cas de double résolution.
 *  - `season_scores` : cache du classement par saison (mis à jour dans la même
 *    transaction que l'insertion de l'événement).
 *  - `season_final_standings` : archive figée des classements de fin de saison
 *    (dont la Saison Bêta).
 *
 * Rien n'est supprimé : `profiles.points`, `pronostics.points_staked`,
 * `pronostics.points_earned` et `pronostics_details.multiplier` sont conservés
 * tels quels (historique de la Saison Bêta + rollback).
 */
export async function up({ context: queryInterface }: { context: QueryInterface }) {
    // ── predictions : métadonnées de résolution / annulation ────────────────
    await queryInterface.addColumn("predictions", "reward_rule_version", {
        type: DataTypes.STRING(32),
        allowNull: true,
    });
    await queryInterface.addColumn("predictions", "resolved_at", {
        type: DataTypes.DATE,
        allowNull: true,
    });
    // Remplace la suppression physique (qui cascadait sur les pronostics).
    await queryInterface.addColumn("predictions", "voided_at", {
        type: DataTypes.DATE,
        allowNull: true,
    });

    // ── Récompense par option ────────────────────────────────────────────────
    await queryInterface.createTable("prediction_reward_options", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        prediction_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "predictions", key: "id" },
            // RESTRICT : on ne doit pas pouvoir effacer un barème déjà utilisé.
            onDelete: "RESTRICT",
        },
        // Acronyme pilote ('HAM'), 'YES' / 'NO', ou '*' = valeur par défaut.
        option_value:          { type: DataTypes.STRING(100), allowNull: false },
        reward_points:         { type: DataTypes.INTEGER, allowNull: false },
        // PODIUM uniquement : les 3 bons pilotes dans le désordre.
        partial_reward_points: { type: DataTypes.INTEGER, allowNull: true },
        rule_version:          { type: DataTypes.STRING(32), allowNull: false },
        // Données ayant servi au calcul (ex. {"standingPosition": 14}) — traçabilité.
        computed_from:         { type: DataTypes.JSONB, allowNull: true },
        created_at:            { type: DataTypes.DATE, allowNull: false, defaultValue: DB_NOW },
    });
    await queryInterface.addIndex("prediction_reward_options", ["prediction_id", "option_value"], {
        unique: true,
        name: "prediction_reward_options_prediction_option_unique",
    });
    await queryInterface.sequelize.query(`
        ALTER TABLE prediction_reward_options
            ADD CONSTRAINT prediction_reward_options_points_check
                CHECK (reward_points BETWEEN 1 AND 1000),
            ADD CONSTRAINT prediction_reward_options_partial_check
                CHECK (partial_reward_points IS NULL OR partial_reward_points >= 0);
    `);

    // ── pronostics : colonnes du nouveau modèle ──────────────────────────────
    // 'legacy_stake' = ancien pari (Saison Bêta) ; 'fixed_reward' = nouveau modèle.
    await queryInterface.addColumn("pronostics", "scoring_model", {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "legacy_stake",
    });
    await queryInterface.addColumn("pronostics", "season_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "seasons", key: "id" },
        onDelete: "SET NULL",
    });
    await queryInterface.addColumn("pronostics", "reward_points_snapshot", {
        type: DataTypes.INTEGER,
        allowNull: true,
    });
    await queryInterface.addColumn("pronostics", "partial_reward_points_snapshot", {
        type: DataTypes.INTEGER,
        allowNull: true,
    });
    await queryInterface.addColumn("pronostics", "reward_rule_version", {
        type: DataTypes.STRING(32),
        allowNull: true,
    });
    await queryInterface.addColumn("pronostics", "submitted_at", {
        type: DataTypes.DATE,
        allowNull: true,
    });
    await queryInterface.addColumn("pronostics", "resolved_at", {
        type: DataTypes.DATE,
        allowNull: true,
    });
    await queryInterface.addColumn("pronostics", "championship_points_awarded", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    });

    await queryInterface.sequelize.query(`
        ALTER TABLE pronostics
            ADD CONSTRAINT pronostics_scoring_model_check
                CHECK (scoring_model IN ('legacy_stake', 'fixed_reward')),
            ADD CONSTRAINT pronostics_reward_snapshot_check
                CHECK (reward_points_snapshot IS NULL OR reward_points_snapshot > 0),
            ADD CONSTRAINT pronostics_championship_awarded_check
                CHECK (championship_points_awarded >= 0),
            -- Garde-fou central : un pronostic du nouveau modèle n'a JAMAIS de mise
            -- et possède TOUJOURS une récompense snapshotée.
            ADD CONSTRAINT pronostics_fixed_reward_no_stake
                CHECK (scoring_model <> 'fixed_reward'
                       OR (points_staked = 0 AND points_earned = 0 AND reward_points_snapshot IS NOT NULL));
    `);

    // ── Journal des points de championnat (append-only) ─────────────────────
    await queryInterface.createTable("championship_score_events", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        season_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "seasons", key: "id" },
            onDelete: "RESTRICT",
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        // 'pronostic' : bon pronostic ; 'admin_correction' : correction d'arbitrage tracée.
        source_type: { type: DataTypes.STRING(32), allowNull: false },
        source_id:   { type: DataTypes.BIGINT, allowNull: false },
        points:      { type: DataTypes.INTEGER, allowNull: false },
        reason:      { type: DataTypes.STRING(255), allowNull: true },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DB_NOW },
    });
    await queryInterface.addIndex("championship_score_events", ["source_type", "source_id"], {
        unique: true,
        name: "championship_score_events_source_unique",
    });
    await queryInterface.addIndex("championship_score_events", ["season_id", "user_id"], {
        name: "championship_score_events_season_user_idx",
    });
    await queryInterface.sequelize.query(`
        ALTER TABLE championship_score_events
            ADD CONSTRAINT championship_score_events_source_type_check
                CHECK (source_type IN ('pronostic', 'admin_correction')),
            -- Un pronostic ne peut que RAPPORTER des points (jamais en retirer).
            ADD CONSTRAINT championship_score_events_pronostic_positive
                CHECK (source_type <> 'pronostic' OR points > 0);
    `);

    // ── Classement par saison (cache) ────────────────────────────────────────
    await queryInterface.createTable("season_scores", {
        season_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "seasons", key: "id" },
            onDelete: "RESTRICT",
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        points:         { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        correct_count:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        resolved_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        last_scored_at: { type: DataTypes.DATE, allowNull: true },
        updated_at:     { type: DataTypes.DATE, allowNull: false, defaultValue: DB_NOW },
    });
    await queryInterface.sequelize.query(`
        ALTER TABLE season_scores
            ADD CONSTRAINT season_scores_points_check CHECK (points >= 0);
        CREATE INDEX season_scores_rank_idx ON season_scores (season_id, points DESC, user_id ASC);
    `);

    // ── Archive des classements de fin de saison ─────────────────────────────
    await queryInterface.createTable("season_final_standings", {
        season_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "seasons", key: "id" },
            onDelete: "RESTRICT",
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        final_rank:   { type: DataTypes.INTEGER, allowNull: false },
        // Saison Bêta : valeur gelée de profiles.points au moment de la bascule.
        final_score:  { type: DataTypes.INTEGER, allowNull: false },
        participants: { type: DataTypes.INTEGER, allowNull: false },
        stats:        { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        archived_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: DB_NOW },
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.dropTable("season_final_standings");
    await queryInterface.dropTable("season_scores");
    await queryInterface.dropTable("championship_score_events");

    await queryInterface.sequelize.query(`
        ALTER TABLE pronostics
            DROP CONSTRAINT IF EXISTS pronostics_fixed_reward_no_stake,
            DROP CONSTRAINT IF EXISTS pronostics_championship_awarded_check,
            DROP CONSTRAINT IF EXISTS pronostics_reward_snapshot_check,
            DROP CONSTRAINT IF EXISTS pronostics_scoring_model_check;
    `);
    for (const col of [
        "championship_points_awarded",
        "resolved_at",
        "submitted_at",
        "reward_rule_version",
        "partial_reward_points_snapshot",
        "reward_points_snapshot",
        "season_id",
        "scoring_model",
    ]) {
        await queryInterface.removeColumn("pronostics", col);
    }

    await queryInterface.dropTable("prediction_reward_options");

    await queryInterface.removeColumn("predictions", "voided_at");
    await queryInterface.removeColumn("predictions", "resolved_at");
    await queryInterface.removeColumn("predictions", "reward_rule_version");
}
