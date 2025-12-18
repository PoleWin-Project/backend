import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class ChatRoomModel extends Model {
    declare id: BigId;
    declare type: string;
    declare name: string | null;
    declare sessionExternalId: string | null;
    declare leagueId: BigId | null;
    declare isReadOnly: boolean;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initChatRoomModel(sequelize: Sequelize) {
    ChatRoomModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            type: { type: DataTypes.STRING(30), allowNull: false },
            name: { type: DataTypes.STRING(120), allowNull: true },
            sessionExternalId: {
                field: "session_external_id",
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            leagueId: {
                field: "league_id",
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            isReadOnly: {
                field: "is_read_only",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "chat_rooms",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
        }
    );
}
