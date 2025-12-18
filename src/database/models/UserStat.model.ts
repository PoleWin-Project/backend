import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class UserStatModel extends Model {
    declare userId: BigId;
    declare level: number;
    declare xp: number;
    declare totalGpPlayed: number;
    declare totalSessionsPlayed: number;
    declare currentStreakDays: number;
    declare longestStreakDays: number;
    declare updatedAt: Date;
}

export function initUserStatModel(sequelize: Sequelize) {
    UserStatModel.init(
        {
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                primaryKey: true,
            },
            level: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            xp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            totalGpPlayed: {
                field: "total_gp_played",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalSessionsPlayed: {
                field: "total_sessions_played",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            currentStreakDays: {
                field: "current_streak_days",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            longestStreakDays: {
                field: "longest_streak_days",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "user_stats",
            timestamps: false,
            underscored: true,
        }
    );
}
