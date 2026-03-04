import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	HasManyGetAssociationsMixin,
	BelongsToGetAssociationMixin,
} from "sequelize";
import type { PronosticModel } from "./pronostic.model";
import type { RaceSessionModel } from "./raceSession.model";

export class PredictionModel extends Model<
	InferAttributes<PredictionModel>,
	InferCreationAttributes<PredictionModel>
> {
	declare id: CreationOptional<number>;
	declare sessionId: number;
	declare title: string;
	declare scope: string | null;
	declare closesAt: Date | null;
	declare createdAt: CreationOptional<Date>;

	declare getSession: BelongsToGetAssociationMixin<RaceSessionModel>;
	declare getPronostics: HasManyGetAssociationsMixin<PronosticModel>;

	declare session?: RaceSessionModel;
	declare pronostics?: PronosticModel[];

	declare static associations: {
		session: Association<PredictionModel, RaceSessionModel>;
		pronostics: Association<PredictionModel, PronosticModel>;
	};

	static initModel(sequelize: Sequelize) {
		PredictionModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				sessionId: { type: DataTypes.INTEGER, allowNull: false, field: "session_id" },
				title: { type: DataTypes.STRING, allowNull: false },
				scope: { type: DataTypes.STRING, allowNull: true },
				closesAt: { type: DataTypes.DATE, allowNull: true, field: "closes_at" },
				createdAt: {
					type: DataTypes.DATE,
					allowNull: false,
					field: "created_at",
					defaultValue: DataTypes.NOW,
				},
			},
			{
				sequelize,
				tableName: "predictions",
				timestamps: false,
				underscored: true,
			}
		);

		return PredictionModel;
	}
}
