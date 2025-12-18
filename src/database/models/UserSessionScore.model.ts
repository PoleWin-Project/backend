import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class UserSessionScoreModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare sessionExternalId: string;
    declare points: number;
    declare rankGlobal: number | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initUserSessionScoreModel(sequelize: Sequelize) {
    UserSessionScoreModel.init(
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
            sessionExternalId: {
                field: "session_external_id",
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            points: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            rankGlobal: {
                field: "rank_global",
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "user_session_scores",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["user_id", "session_external_id"],
                    name: "uq_user_session_scores",
                },
            ],
        }
    );
}
