import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class UserProfileModel extends Model {
    declare userId: BigId;
    declare displayName: string | null;
    declare avatarUrl: string | null;
    declare bio: string | null;
    declare favoriteTeamCode: string | null;
    declare favoriteDriverCode: string | null;
    declare timeZone: string | null;
    declare isProfilePublic: boolean;
    declare showStats: boolean;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initUserProfileModel(sequelize: Sequelize) {
    UserProfileModel.init(
        {
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                primaryKey: true,
            },
            displayName: {
                field: "display_name",
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            avatarUrl: {
                field: "avatar_url",
                type: DataTypes.STRING(500),
                allowNull: true,
            },
            bio: { type: DataTypes.TEXT, allowNull: true },
            favoriteTeamCode: {
                field: "favorite_team_code",
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            favoriteDriverCode: {
                field: "favorite_driver_code",
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            timeZone: {
                field: "time_zone",
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            isProfilePublic: {
                field: "is_profile_public",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            showStats: {
                field: "show_stats",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "user_profiles",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
        }
    );
}
