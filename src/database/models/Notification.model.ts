import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class NotificationModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare type: string;
    declare payload: any | null;
    declare isRead: boolean;
    declare createdAt: Date;
}

export function initNotificationModel(sequelize: Sequelize) {
    NotificationModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            type: { type: DataTypes.STRING(50), allowNull: false },
            payload: { type: DataTypes.JSONB, allowNull: true },
            isRead: {
                field: "is_read",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "notifications",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    fields: ["user_id", "created_at"],
                    name: "idx_notifications_user_created",
                },
            ],
        }
    );
}
