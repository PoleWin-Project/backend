import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class UserSeasonScoreModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare seasonYear: number;
    declare totalPoints: number;
    declare rankGlobal: number | null;
    declare lastUpdated: Date;
}

export function initUserSeasonScoreModel(sequelize: Sequelize) {
    UserSeasonScoreModel.init(
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
            rankGlobal: {
                field: "rank_global",
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            lastUpdated: { field: "last_updated", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "user_season_scores",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["user_id", "season_year"],
                    name: "uq_user_season_scores",
                },
            ],
        }
    );
}
