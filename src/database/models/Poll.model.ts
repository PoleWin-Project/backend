import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class PollModel extends Model {
    declare id: BigId;
    declare roomId: BigId;
    declare messageId: BigId | null;
    declare question: string;
    declare createdByUserId: BigId | null;
    declare createdAt: Date;
    declare closesAt: Date | null;
}

export function initPollModel(sequelize: Sequelize) {
    PollModel.init(
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
            messageId: {
                field: "message_id",
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            question: { type: DataTypes.TEXT, allowNull: false },
            createdByUserId: {
                field: "created_by_user_id",
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            closesAt: {
                field: "closes_at",
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        { sequelize, tableName: "polls", timestamps: false, underscored: true }
    );
}
