import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	BelongsToGetAssociationMixin,
} from "sequelize";
import type { UserModel } from "./User.model";
import type { ChatChannelModel } from "./chatChannel.model";

export class ChannelMessageModel extends Model<
	InferAttributes<ChannelMessageModel>,
	InferCreationAttributes<ChannelMessageModel>
> {
	declare id: CreationOptional<number>;
	declare senderId: number;
	declare channelId: number;
	declare content: string;
	declare createdAt: CreationOptional<Date>;

	declare getSender: BelongsToGetAssociationMixin<UserModel>;
	declare getChannel: BelongsToGetAssociationMixin<ChatChannelModel>;

	declare sender?: UserModel;
	declare channel?: ChatChannelModel;

	declare static associations: {
		sender: Association<ChannelMessageModel, UserModel>;
		channel: Association<ChannelMessageModel, ChatChannelModel>;
	};

	static initModel(sequelize: Sequelize) {
		ChannelMessageModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				senderId: { type: DataTypes.INTEGER, allowNull: false, field: "sender_id" },
				channelId: { type: DataTypes.INTEGER, allowNull: false, field: "channel_id" },
				content: { type: DataTypes.TEXT, allowNull: false },
				createdAt: {
					type: DataTypes.DATE,
					allowNull: false,
					field: "created_at",
					defaultValue: DataTypes.NOW,
				},
			},
			{
				sequelize,
				tableName: "messages",
				timestamps: false,
				underscored: true,
				indexes: [
					{ fields: ["channel_id", "created_at"], name: "messages_channel_created_idx" },
				],
			}
		);

		return ChannelMessageModel;
	}
}
