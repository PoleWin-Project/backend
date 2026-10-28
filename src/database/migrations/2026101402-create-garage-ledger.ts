import { DataTypes, QueryInterface, literal } from "sequelize";

// NB : `defaultValue: DataTypes.NOW` ne crée PAS de DEFAULT côté Postgres (Sequelize
// l'applique seulement côté JS). Ces tables étant aussi alimentées en SQL brut
// (script de bascule, upserts), on pose un vrai DEFAULT now() en base.
const DB_NOW = literal("now()");

/**
 * Migration « no simulated gambling » — étape 3/4 (ADDITIVE).
 *
 * Crédits Garage = monnaie COSMÉTIQUE, totalement séparée des points de championnat :
 *  - jamais utilisée par le classement ni par les pronostics ;
 *  - aucune valeur monétaire, non transférable, non convertible.
 *
 * Modèle « ledger » :
 *  - `garage_transactions` est la source de vérité (chaque mouvement, signé, avec une
 *    `idempotency_key` UNIQUE qui empêche tout double crédit/débit : conversion bêta,
 *    mini-jeu, futur achat IAP identifié par son transactionId Apple/Google…).
 *  - `garage_wallets.balance` est un cache du solde, protégé par CHECK (balance >= 0).
 *
 * Les tables de la future boutique (cosmetic_items, user_cosmetics) ne sont PAS créées
 * ici : elles le seront avec la boutique (cf. plan §8.2).
 */
export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.createTable("garage_wallets", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        balance:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DB_NOW },
    });
    await queryInterface.sequelize.query(`
        ALTER TABLE garage_wallets
            ADD CONSTRAINT garage_wallets_balance_check CHECK (balance >= 0);
    `);

    await queryInterface.createTable("garage_transactions", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        // Positif = crédit, négatif = débit (jamais 0).
        amount:          { type: DataTypes.INTEGER, allowNull: false },
        kind:            { type: DataTypes.STRING(32), allowNull: false },
        reference_type:  { type: DataTypes.STRING(32), allowNull: true },
        reference_id:    { type: DataTypes.STRING(128), allowNull: true },
        idempotency_key: { type: DataTypes.STRING(128), allowNull: false, unique: true },
        balance_after:   { type: DataTypes.INTEGER, allowNull: false },
        metadata:        { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        created_at:      { type: DataTypes.DATE, allowNull: false, defaultValue: DB_NOW },
    });
    await queryInterface.addIndex("garage_transactions", ["user_id", "created_at"], {
        name: "garage_transactions_user_created_idx",
    });
    await queryInterface.sequelize.query(`
        ALTER TABLE garage_transactions
            ADD CONSTRAINT garage_transactions_amount_check CHECK (amount <> 0),
            ADD CONSTRAINT garage_transactions_balance_after_check CHECK (balance_after >= 0),
            ADD CONSTRAINT garage_transactions_kind_check CHECK (kind IN (
                'beta_conversion', 'minigame', 'mission', 'streak', 'achievement',
                'cosmetic_purchase', 'iap_purchase', 'iap_refund', 'admin_adjustment'
            ));
    `);
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.dropTable("garage_transactions");
    await queryInterface.dropTable("garage_wallets");
}
