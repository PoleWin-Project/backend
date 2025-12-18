import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class ChatReactionModel extends Model {
    declare id: BigId;
    declare messageId: BigId;
    declare userId: BigId;
    declare emoji: string;
    declare createdAt: Date;
}

export function initChatReactionModel(sequelize: Sequelize) {
    ChatReactionModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            messageId: {
                field: "message_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            emoji: { type: DataTypes.STRING(20), allowNull: false },
            createdAt: { field: "created_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "chat_reactions",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["message_id", "user_id", "emoji"],
                    name: "uq_chat_reactions",
                },
            ],
        }
    );
}
