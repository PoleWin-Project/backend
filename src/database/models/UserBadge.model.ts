import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class UserBadgeModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare badgeId: BigId;
    declare earnedAt: Date;
    declare source: string | null;
}

export function initUserBadgeModel(sequelize: Sequelize) {
    UserBadgeModel.init(
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
            badgeId: {
                field: "badge_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            earnedAt: { field: "earned_at", type: DataTypes.DATE },
            source: { type: DataTypes.STRING(50), allowNull: true },
        },
        {
            sequelize,
            tableName: "user_badges",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["user_id", "badge_id"],
                    name: "uq_user_badges",
                },
            ],
        }
    );
}
