import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
} from "sequelize";

export const GARAGE_TRANSACTION_KINDS = [
	"beta_conversion",
	"minigame",
	"mission",
	"streak",
	"achievement",
	"cosmetic_purchase",
	"iap_purchase",
	"iap_refund",
	"admin_adjustment",
] as const;

export type GarageTransactionKind = (typeof GARAGE_TRANSACTION_KINDS)[number];

/**
 * Ledger des crédits Garage (source de vérité du solde).
 * `idempotencyKey` UNIQUE : rejouer une même opération (requête dupliquée, script
 * relancé, notification IAP reçue deux fois) ne crédite/débite jamais deux fois.
 */
export class GarageTransactionModel extends Model<
	InferAttributes<GarageTransactionModel>,
	InferCreationAttributes<GarageTransactionModel>
> {
	declare id: CreationOptional<number>;
	declare userId: number;
	declare amount: number;
	declare kind: GarageTransactionKind;
	declare referenceType: string | null;
	declare referenceId: string | null;
	declare idempotencyKey: string;
	declare balanceAfter: number;
	declare metadata: CreationOptional<Record<string, unknown>>;
	declare createdAt: CreationOptional<Date>;

	static initModel(sequelize: Sequelize) {
		GarageTransactionModel.init(
			{
				id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
				userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
				amount: { type: DataTypes.INTEGER, allowNull: false },
				kind: { type: DataTypes.STRING(32), allowNull: false },
				referenceType: { type: DataTypes.STRING(32), allowNull: true, field: "reference_type" },
				referenceId: { type: DataTypes.STRING(128), allowNull: true, field: "reference_id" },
				idempotencyKey: { type: DataTypes.STRING(128), allowNull: false, unique: true, field: "idempotency_key" },
				balanceAfter: { type: DataTypes.INTEGER, allowNull: false, field: "balance_after" },
				metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
				createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at", defaultValue: DataTypes.NOW },
			},
			{ sequelize, tableName: "garage_transactions", timestamps: false, underscored: true },
		);
		return GarageTransactionModel;
	}
}
