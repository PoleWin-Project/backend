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

export class DirectMessageModel extends Model<
    InferAttributes<DirectMessageModel>,
    InferCreationAttributes<DirectMessageModel>
> {
    declare id: CreationOptional<number>;
    declare senderId: number;
    declare receiverId: number;
    declare content: string;
    declare isRead: CreationOptional<boolean>;
    declare createdAt: CreationOptional<Date>;

    declare getSender: BelongsToGetAssociationMixin<UserModel>;
    declare getReceiver: BelongsToGetAssociationMixin<UserModel>;

    declare sender?: UserModel;
    declare receiver?: UserModel;

    declare static associations: {
        sender: Association<DirectMessageModel, UserModel>;
        receiver: Association<DirectMessageModel, UserModel>;
    };

    static initModel(sequelize: Sequelize) {
        DirectMessageModel.init(
            {
                id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
                senderId:   { type: DataTypes.INTEGER, allowNull: false, field: "sender_id" },
                receiverId: { type: DataTypes.INTEGER, allowNull: false, field: "receiver_id" },
                content:    { type: DataTypes.TEXT,    allowNull: false },
                isRead:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_read" },
                createdAt:  { type: DataTypes.DATE, allowNull: false, field: "created_at", defaultValue: DataTypes.NOW },
            },
            {
                sequelize,
                tableName: "direct_messages",
                timestamps: false,
                underscored: true,
                indexes: [
                    { fields: ["sender_id", "receiver_id", "created_at"], name: "dm_sender_receiver_created_idx" },
                    { fields: ["receiver_id", "is_read"], name: "dm_receiver_read_idx" },
                ],
            }
        );
        return DirectMessageModel;
    }
}
