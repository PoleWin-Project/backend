import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class PredictionSetModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare contestId: BigId;
    declare createdAt: Date;
    declare lockedAt: Date | null;
    declare status: string;
    declare totalPointsEarned: number;
}

export function initPredictionSetModel(sequelize: Sequelize) {
    PredictionSetModel.init(
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
            contestId: {
                field: "contest_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            lockedAt: {
                field: "locked_at",
                type: DataTypes.DATE,
                allowNull: true,
            },
            status: {
                type: DataTypes.STRING(30),
                allowNull: false,
                defaultValue: "draft",
            },
            totalPointsEarned: {
                field: "total_points_earned",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        },
        {
            sequelize,
            tableName: "prediction_sets",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["user_id", "contest_id"],
                    name: "uq_prediction_sets",
                },
                { fields: ["user_id"], name: "idx_prediction_sets_user" },
            ],
        }
    );
}
