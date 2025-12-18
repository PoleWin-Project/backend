import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class PredictionContestModel extends Model {
    declare id: BigId;
    declare type: string;
    declare title: string;
    declare description: string | null;
    declare sessionExternalId: string | null;
    declare seasonYear: number | null;
    declare opensAt: Date | null;
    declare closesAt: Date | null;
    declare maxBudgetPoints: number | null;
    declare isActive: boolean;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initPredictionContestModel(sequelize: Sequelize) {
    PredictionContestModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            type: { type: DataTypes.STRING(50), allowNull: false },
            title: { type: DataTypes.STRING(200), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            sessionExternalId: {
                field: "session_external_id",
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            seasonYear: {
                field: "season_year",
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            opensAt: {
                field: "opens_at",
                type: DataTypes.DATE,
                allowNull: true,
            },
            closesAt: {
                field: "closes_at",
                type: DataTypes.DATE,
                allowNull: true,
            },
            maxBudgetPoints: {
                field: "max_budget_points",
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            isActive: {
                field: "is_active",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "prediction_contests",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
        }
    );
}
