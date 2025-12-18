import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class ReportModel extends Model {
    declare id: BigId;
    declare reporterUserId: BigId | null;
    declare targetType: string;
    declare targetId: BigId;
    declare reason: string | null;
    declare description: string | null;
    declare status: string;
    declare createdAt: Date;
    declare resolvedAt: Date | null;
    declare resolvedByUserId: BigId | null;
}

export function initReportModel(sequelize: Sequelize) {
    ReportModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            reporterUserId: {
                field: "reporter_user_id",
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            targetType: {
                field: "target_type",
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            targetId: {
                field: "target_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            reason: { type: DataTypes.STRING(120), allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            status: {
                type: DataTypes.STRING(30),
                allowNull: false,
                defaultValue: "open",
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            resolvedAt: {
                field: "resolved_at",
                type: DataTypes.DATE,
                allowNull: true,
            },
            resolvedByUserId: {
                field: "resolved_by_user_id",
                type: DataTypes.BIGINT,
                allowNull: true,
            },
        },
        {
            sequelize,
            tableName: "reports",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    fields: ["target_type", "target_id"],
                    name: "idx_reports_target",
                },
            ],
        }
    );
}
