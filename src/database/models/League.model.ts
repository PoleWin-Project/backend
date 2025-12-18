import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class LeagueModel extends Model {
    declare id: BigId;
    declare name: string;
    declare description: string | null;
    declare ownerUserId: BigId | null;
    declare seasonYear: number | null;
    declare isPublic: boolean;
    declare inviteCode: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initLeagueModel(sequelize: Sequelize) {
    LeagueModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            name: { type: DataTypes.STRING(120), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            ownerUserId: {
                field: "owner_user_id",
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            seasonYear: {
                field: "season_year",
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            isPublic: {
                field: "is_public",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            inviteCode: {
                field: "invite_code",
                type: DataTypes.STRING(64),
                allowNull: true,
                unique: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "leagues",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
        }
    );
}
