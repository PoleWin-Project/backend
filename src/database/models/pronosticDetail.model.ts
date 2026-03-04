import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	Model,
	Sequelize,
	Association,
	BelongsToGetAssociationMixin,
} from "sequelize";
import type { PronosticModel } from "./pronostic.model";

export class PronosticDetailModel extends Model<
	InferAttributes<PronosticDetailModel>,
	InferCreationAttributes<PronosticDetailModel>
> {
	declare pronosticId: number;
	declare value: string;
	declare multiplier: number | null;

	declare getPronostic: BelongsToGetAssociationMixin<PronosticModel>;
	declare pronostic?: PronosticModel;

	declare static associations: {
		pronostic: Association<PronosticDetailModel, PronosticModel>;
	};

	static initModel(sequelize: Sequelize) {
		PronosticDetailModel.init(
			{
				pronosticId: {
					type: DataTypes.INTEGER,
					allowNull: false,
					primaryKey: true,
					field: "pronostic_id",
				},
				value: { type: DataTypes.STRING, allowNull: false },
				multiplier: { type: DataTypes.FLOAT, allowNull: true },
			},
			{
				sequelize,
				tableName: "pronostics_details",
				timestamps: false,
				underscored: true,
			}
		);

		return PronosticDetailModel;
	}
}
