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
import type { MessageModel } from "./message.model";

export class ChatChannelModel extends Model<
	InferAttributes<ChatChannelModel>,
	InferCreationAttributes<ChatChannelModel>
> {
	declare id: CreationOptional<number>;
	declare name: string;
	declare sessionId: number;

	declare getSession: BelongsToGetAssociationMixin<RaceSessionModel>;
	declare getMessages: HasManyGetAssociationsMixin<MessageModel>;

	declare session?: RaceSessionModel;
	declare messages?: MessageModel[];

	declare static associations: {
		session: Association<ChatChannelModel, RaceSessionModel>;
		messages: Association<ChatChannelModel, MessageModel>;
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
			}
		);

		return ChatChannelModel;
	}
}
