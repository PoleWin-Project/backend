import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class ChatMessageModel extends Model {
    declare id: BigId;
    declare roomId: BigId;
    declare userId: BigId | null;
    declare content: string | null;
    declare messageType: string;
    declare parentMessageId: BigId | null;
    declare isDeleted: boolean;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initChatMessageModel(sequelize: Sequelize) {
    ChatMessageModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            roomId: {
                field: "room_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            content: { type: DataTypes.TEXT, allowNull: true },
            messageType: {
                field: "message_type",
                type: DataTypes.STRING(30),
                allowNull: false,
                defaultValue: "text",
            },
            parentMessageId: {
                field: "parent_message_id",
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            isDeleted: {
                field: "is_deleted",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "chat_messages",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                {
                    fields: ["room_id", "created_at"],
                    name: "idx_chat_messages_room_created",
                },
            ],
        }
    );
}
