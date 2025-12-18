import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class LeagueScoreModel extends Model {
    declare id: BigId;
    declare leagueId: BigId;
    declare userId: BigId;
    declare seasonYear: number;
    declare totalPoints: number;
    declare updatedAt: Date;
}

export function initLeagueScoreModel(sequelize: Sequelize) {
    LeagueScoreModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            leagueId: {
                field: "league_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            seasonYear: {
                field: "season_year",
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            totalPoints: {
                field: "total_points",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "league_scores",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["league_id", "user_id", "season_year"],
                    name: "uq_league_scores",
                },
            ],
        }
    );
}
