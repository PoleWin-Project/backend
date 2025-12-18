import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class PredictionRuleModel extends Model {
    declare id: BigId;
    declare sessionType: string;
    declare code: string;
    declare label: string | null;
    declare description: string | null;
    declare maxPoints: number;
    declare sortOrder: number;
    declare isActive: boolean;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initPredictionRuleModel(sequelize: Sequelize) {
    PredictionRuleModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            sessionType: {
                field: "session_type",
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            code: { type: DataTypes.STRING(50), allowNull: false },
            label: { type: DataTypes.STRING(120), allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            maxPoints: {
                field: "max_points",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            sortOrder: {
                field: "sort_order",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
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
            tableName: "prediction_rules",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["session_type", "code"],
                    name: "uq_prediction_rules",
                },
            ],
        }
    );
}
