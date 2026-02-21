// src/database/models/message.model.ts
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
import type { ConversationModel } from "./conversation.model";

export class MessageModel extends Model<
  InferAttributes<MessageModel>,
  InferCreationAttributes<MessageModel>
> {
  declare id: CreationOptional<number>;
  declare senderId: number;
  declare conversationId: number;
  declare content: string;
  declare isRead: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;

  // Associations
  declare getSender: BelongsToGetAssociationMixin<UserModel>;
  declare getConversation: BelongsToGetAssociationMixin<ConversationModel>;

  declare sender?: UserModel;
  declare conversation?: ConversationModel;

  declare static associations: {
    sender: Association<MessageModel, UserModel>;
    conversation: Association<MessageModel, ConversationModel>;
  };

  static initModel(sequelize: Sequelize) {
    MessageModel.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        senderId: { type: DataTypes.INTEGER, allowNull: false, field: "sender_id" },
        conversationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "conversation_id",
        },
        content: { type: DataTypes.TEXT, allowNull: false },
        isRead: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "is_read",
        },
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
          { fields: ["conversation_id", "created_at"], name: "messages_conv_created_idx" },
        ],
      }
    );

    return MessageModel;
  }
}
