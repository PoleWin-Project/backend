import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class XpEventModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare type: string;
    declare amount: number;
    declare metadata: any | null;
    declare createdAt: Date;
}

export function initXpEventModel(sequelize: Sequelize) {
    XpEventModel.init(
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
            type: { type: DataTypes.STRING(50), allowNull: false },
            amount: { type: DataTypes.INTEGER, allowNull: false },
            metadata: { type: DataTypes.JSONB, allowNull: true },
            createdAt: { field: "created_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "xp_events",
            timestamps: false,
            underscored: true,
        }
    );
}
