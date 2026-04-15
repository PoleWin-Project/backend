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

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export class FriendRequestModel extends Model<
    InferAttributes<FriendRequestModel>,
    InferCreationAttributes<FriendRequestModel>
> {
    declare id: CreationOptional<number>;
    declare senderId: number;
    declare receiverId: number;
    declare status: FriendRequestStatus;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare getSender: BelongsToGetAssociationMixin<UserModel>;
    declare getReceiver: BelongsToGetAssociationMixin<UserModel>;

    declare sender?: UserModel;
    declare receiver?: UserModel;

    declare static associations: {
        sender: Association<FriendRequestModel, UserModel>;
        receiver: Association<FriendRequestModel, UserModel>;
    };

    static initModel(sequelize: Sequelize) {
        FriendRequestModel.init(
            {
                id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
                senderId:   { type: DataTypes.INTEGER, allowNull: false, field: "sender_id" },
                receiverId: { type: DataTypes.INTEGER, allowNull: false, field: "receiver_id" },
                status:     { type: DataTypes.STRING,  allowNull: false, defaultValue: "pending" },
                createdAt:  { type: DataTypes.DATE, allowNull: false, field: "created_at", defaultValue: DataTypes.NOW },
                updatedAt:  { type: DataTypes.DATE, allowNull: false, field: "updated_at", defaultValue: DataTypes.NOW },
            },
            {
                sequelize,
                tableName: "friend_requests",
                timestamps: true,
                underscored: true,
                indexes: [
                    { unique: true, fields: ["sender_id", "receiver_id"], name: "friend_requests_sender_receiver_unique" },
                    { fields: ["receiver_id", "status"], name: "friend_requests_receiver_status_idx" },
                ],
            }
        );
        return FriendRequestModel;
    }
}
