import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	HasManyGetAssociationsMixin,
} from "sequelize";
import type { PredictionModel } from "./prediction.model";
import type { ChatChannelModel } from "./chatChannel.model";

export class RaceSessionModel extends Model<
	InferAttributes<RaceSessionModel>,
	InferCreationAttributes<RaceSessionModel>
> {
	declare id: CreationOptional<number>;
	declare idCourseExternal: number | null;
	declare name: string;
	declare type: string;
	declare location: string | null;
	declare dateStart: Date | null;

	declare getPredictions: HasManyGetAssociationsMixin<PredictionModel>;
	declare getChatChannels: HasManyGetAssociationsMixin<ChatChannelModel>;

	declare predictions?: PredictionModel[];
	declare chatChannels?: ChatChannelModel[];

	declare static associations: {
		predictions: Association<RaceSessionModel, PredictionModel>;
		chatChannels: Association<RaceSessionModel, ChatChannelModel>;
	};

	static initModel(sequelize: Sequelize) {
		RaceSessionModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				idCourseExternal: { type: DataTypes.INTEGER, allowNull: true, field: "id_course_external" },
				name: { type: DataTypes.STRING, allowNull: false },
				type: { type: DataTypes.STRING, allowNull: false },
				location: { type: DataTypes.STRING, allowNull: true, field: "location" },
				dateStart: { type: DataTypes.DATE, allowNull: true, field: "date_start" },
			},
			{
				sequelize,
				tableName: "race_sessions",
				timestamps: false,
				underscored: true,
			}
		);

		return RaceSessionModel;
	}
}
