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
	declare type: "POLE_POSITION" | "RACE_WINNER" | "SPRINT_WINNER";
	declare scope: string | null;
	declare closesAt: Date | null;
	declare defaultMultiplier: CreationOptional<number>;
	declare winningValue: CreationOptional<string | null>;
	declare resultSource: CreationOptional<string | null>;
	declare resultStatus: CreationOptional<"pending" | "provisional" | "validated">;
	declare resolvedAt: CreationOptional<Date | null>;
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
				type: {
					type: DataTypes.STRING,
					allowNull: false,
					field: "title",
				},
				scope: { type: DataTypes.STRING, allowNull: true },
				closesAt: { type: DataTypes.DATE, allowNull: true, field: "closes_at" },
				defaultMultiplier: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 2, field: "default_multiplier" },
				winningValue: { type: DataTypes.STRING, allowNull: true, field: "winning_value" },
				resultSource: { type: DataTypes.STRING, allowNull: true, field: "result_source" },
				resultStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending", field: "result_status" },
				resolvedAt: { type: DataTypes.DATE, allowNull: true, field: "resolved_at" },
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
