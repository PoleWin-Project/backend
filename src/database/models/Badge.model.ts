import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class BadgeModel extends Model {
    declare id: BigId;
    declare code: string;
    declare name: string;
    declare description: string | null;
    declare category: string | null;
    declare iconUrl: string | null;
    declare rarity: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initBadgeModel(sequelize: Sequelize) {
    BadgeModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            code: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },
            name: { type: DataTypes.STRING(120), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            category: { type: DataTypes.STRING(50), allowNull: true },
            iconUrl: {
                field: "icon_url",
                type: DataTypes.STRING(500),
                allowNull: true,
            },
            rarity: { type: DataTypes.STRING(30), allowNull: true },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "badges",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
        }
    );
}
