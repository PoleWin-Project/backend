import { DataTypes, QueryInterface, literal } from "sequelize";

const DB_NOW = literal("now()");

/**
 * Rend la résolution des pronostics réconciliable :
 * - un résultat officiel doit être observé deux fois avant la première attribution ;
 * - il reste provisoire pendant la fenêtre de contrôle ;
 * - toute modification ultérieure est historisée et compensée dans le ledger.
 */
export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("predictions", "result_status", {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "pending",
    });
    await queryInterface.addColumn("predictions", "candidate_winning_value", {
        type: DataTypes.STRING,
        allowNull: true,
    });
    await queryInterface.addColumn("predictions", "candidate_seen_at", {
        type: DataTypes.DATE,
        allowNull: true,
    });
    await queryInterface.addColumn("predictions", "result_source", {
        type: DataTypes.STRING(64),
        allowNull: true,
    });
    await queryInterface.addColumn("predictions", "result_checked_at", {
        type: DataTypes.DATE,
        allowNull: true,
    });
    await queryInterface.addColumn("predictions", "reconciliation_until", {
        type: DataTypes.DATE,
        allowNull: true,
    });

    // Les résultats déjà attribués avant cette migration sont considérés finaux :
    // ils ne doivent pas être retraités automatiquement au premier déploiement.
    await queryInterface.sequelize.query(`
        UPDATE predictions
           SET result_status = 'final',
               result_source = 'legacy_resolution',
               result_checked_at = COALESCE(resolved_at, now())
         WHERE winning_value IS NOT NULL OR voided_at IS NOT NULL;

        ALTER TABLE predictions
            ADD CONSTRAINT predictions_result_status_check
                CHECK (result_status IN ('pending', 'provisional', 'corrected', 'final'));

        CREATE INDEX predictions_result_reconciliation_idx
            ON predictions (result_status, reconciliation_until)
         WHERE voided_at IS NULL AND result_status <> 'final';
    `);

    await queryInterface.createTable("prediction_result_revisions", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        prediction_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "predictions", key: "id" },
            onDelete: "RESTRICT",
        },
        previous_value: { type: DataTypes.STRING, allowNull: true },
        new_value: { type: DataTypes.STRING, allowNull: false },
        state: { type: DataTypes.STRING(16), allowNull: false },
        source: { type: DataTypes.STRING(64), allowNull: false },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },
        observed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DB_NOW },
    });
    await queryInterface.addIndex("prediction_result_revisions", ["prediction_id", "observed_at"], {
        name: "prediction_result_revisions_prediction_observed_idx",
    });
    await queryInterface.sequelize.query(`
        ALTER TABLE prediction_result_revisions
            ADD CONSTRAINT prediction_result_revisions_state_check
                CHECK (state IN ('provisional', 'corrected', 'final'));

        ALTER TABLE prediction_result_revisions ENABLE ROW LEVEL SECURITY;

        CREATE SEQUENCE championship_admin_correction_source_id_seq;

        SELECT setval(
            'championship_admin_correction_source_id_seq',
            GREATEST(
                COALESCE((SELECT MAX(source_id) FROM championship_score_events WHERE source_type = 'admin_correction'), 0) + 1,
                1
            ),
            false
        );

        DO $revoke$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON prediction_result_revisions FROM anon;
                REVOKE ALL ON SEQUENCE prediction_result_revisions_id_seq FROM anon;
                REVOKE ALL ON SEQUENCE championship_admin_correction_source_id_seq FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON prediction_result_revisions FROM authenticated;
                REVOKE ALL ON SEQUENCE prediction_result_revisions_id_seq FROM authenticated;
                REVOKE ALL ON SEQUENCE championship_admin_correction_source_id_seq FROM authenticated;
            END IF;
        END
        $revoke$;
    `);
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.sequelize.query(`
        DROP SEQUENCE IF EXISTS championship_admin_correction_source_id_seq;
        DROP TABLE IF EXISTS prediction_result_revisions;
        DROP INDEX IF EXISTS predictions_result_reconciliation_idx;
        ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_result_status_check;
    `);
    await queryInterface.removeColumn("predictions", "reconciliation_until");
    await queryInterface.removeColumn("predictions", "result_checked_at");
    await queryInterface.removeColumn("predictions", "result_source");
    await queryInterface.removeColumn("predictions", "candidate_seen_at");
    await queryInterface.removeColumn("predictions", "candidate_winning_value");
    await queryInterface.removeColumn("predictions", "result_status");
}
