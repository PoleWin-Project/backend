import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
} from "sequelize";

/**
 * Solde de crédits Garage (monnaie cosmétique). Cache de garage_transactions :
 * ne jamais le modifier directement, toujours passer par GarageService.
 * N'a AUCUN lien avec les pronostics ni avec le classement.
 */
export class GarageWalletModel extends Model<
	InferAttributes<GarageWalletModel>,
	InferCreationAttributes<GarageWalletModel>
> {
	declare userId: number;
	declare balance: CreationOptional<number>;
	declare updatedAt: CreationOptional<Date>;

	static initModel(sequelize: Sequelize) {
		GarageWalletModel.init(
			{
				userId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: "user_id" },
				balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
				updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at", defaultValue: DataTypes.NOW },
			},
			{ sequelize, tableName: "garage_wallets", timestamps: false, underscored: true },
		);
		return GarageWalletModel;
	}
}
