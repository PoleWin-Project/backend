import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	BelongsToGetAssociationMixin,
	HasManyGetAssociationsMixin,
} from "sequelize";
import type { RaceSessionModel } from "./raceSession.model";
import type { ChannelMessageModel } from "./channelMessage.model";

export class ChatChannelModel extends Model<
	InferAttributes<ChatChannelModel>,
	InferCreationAttributes<ChatChannelModel>
> {
	declare id: CreationOptional<number>;
	declare name: string;
	declare sessionId: number;

	declare getSession: BelongsToGetAssociationMixin<RaceSessionModel>;
	declare getMessages: HasManyGetAssociationsMixin<ChannelMessageModel>;

	declare session?: RaceSessionModel;
	declare messages?: ChannelMessageModel[];

	declare static associations: {
		session: Association<ChatChannelModel, RaceSessionModel>;
		messages: Association<ChatChannelModel, ChannelMessageModel>;
	};

	static initModel(sequelize: Sequelize) {
		ChatChannelModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				name: { type: DataTypes.STRING, allowNull: false },
				sessionId: { type: DataTypes.INTEGER, allowNull: false, field: "session_id" },
			},
			{
				sequelize,
				tableName: "chat_channels",
				timestamps: false,
				underscored: true,
				indexes: [
					{ unique: true, fields: ["session_id"], name: "chat_channels_session_id_unique" },
				],
			}
		);

		return ChatChannelModel;
	}
}
