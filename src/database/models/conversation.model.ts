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
import type { UserModel } from "./user.model";
import type { MessageModel } from "./message.model";

export class ConversationModel extends Model<
  InferAttributes<ConversationModel>,
  InferCreationAttributes<ConversationModel>
> {
  declare id: CreationOptional<number>;
  declare user1Id: number;
  declare user2Id: number;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;

  declare getUser1: BelongsToGetAssociationMixin<UserModel>;
  declare getUser2: BelongsToGetAssociationMixin<UserModel>;
  declare getMessages: HasManyGetAssociationsMixin<MessageModel>;

  declare user1?: UserModel;
  declare user2?: UserModel;
  declare messages?: MessageModel[];

  declare static associations: {
    user1: Association<ConversationModel, UserModel>;
    user2: Association<ConversationModel, UserModel>;
    messages: Association<ConversationModel, MessageModel>;
  };

  static initModel(sequelize: Sequelize) {
    ConversationModel.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        user1Id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "user1_id",
        },
        user2Id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "user2_id",
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: "is_active",
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
        tableName: "conversations",
        timestamps: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["user1_id", "user2_id"],
            name: "conversations_user1_user2_unique",
          },
        ],
      },
    );

    return ConversationModel;
  }
}
