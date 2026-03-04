import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	BelongsToGetAssociationMixin,
	HasOneGetAssociationMixin,
} from "sequelize";
import type { UserModel } from "./User.model";
import type { PredictionModel } from "./prediction.model";
import type { PronosticDetailModel } from "./pronosticDetail.model";

export class PronosticModel extends Model<
	InferAttributes<PronosticModel>,
	InferCreationAttributes<PronosticModel>
> {
	declare id: CreationOptional<number>;
	declare userId: number;
	declare predictionId: number;
	declare pointsStaked: CreationOptional<number>;
	declare pointsEarned: CreationOptional<number>;
	declare status: CreationOptional<string>;

	declare getUser: BelongsToGetAssociationMixin<UserModel>;
	declare getPrediction: BelongsToGetAssociationMixin<PredictionModel>;
	declare getDetail: HasOneGetAssociationMixin<PronosticDetailModel>;

	declare user?: UserModel;
	declare prediction?: PredictionModel;
	declare detail?: PronosticDetailModel;

	declare static associations: {
		user: Association<PronosticModel, UserModel>;
		prediction: Association<PronosticModel, PredictionModel>;
		detail: Association<PronosticModel, PronosticDetailModel>;
	};

	static initModel(sequelize: Sequelize) {
		PronosticModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
				predictionId: { type: DataTypes.INTEGER, allowNull: false, field: "prediction_id" },
				pointsStaked: {
					type: DataTypes.INTEGER,
					allowNull: false,
					defaultValue: 0,
					field: "points_staked",
				},
				pointsEarned: {
					type: DataTypes.INTEGER,
					allowNull: false,
					defaultValue: 0,
					field: "points_earned",
				},
				status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
			},
			{
				sequelize,
				tableName: "pronostics",
				timestamps: false,
				underscored: true,
				indexes: [
					{
						unique: true,
						fields: ["user_id", "prediction_id"],
						name: "pronostics_user_prediction_unique",
					},
					{ fields: ["prediction_id"], name: "pronostics_prediction_idx" },
					{ fields: ["user_id"], name: "pronostics_user_idx" },
				],
			}
		);

		return PronosticModel;
	}
}
