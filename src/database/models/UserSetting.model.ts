import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class UserSettingModel extends Model {
    declare userId: BigId;
    declare emailNotifications: boolean;
    declare pushNotifications: boolean;
    declare discordNotifications: boolean;
    declare language: string | null;
    declare timezone: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initUserSettingModel(sequelize: Sequelize) {
    UserSettingModel.init(
        {
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                primaryKey: true,
            },
            emailNotifications: {
                field: "email_notifications",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            pushNotifications: {
                field: "push_notifications",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            discordNotifications: {
                field: "discord_notifications",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            language: { type: DataTypes.STRING(20), allowNull: true },
            timezone: { type: DataTypes.STRING(64), allowNull: true },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "user_settings",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
        }
    );
}
