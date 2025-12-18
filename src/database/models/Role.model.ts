import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class RoleModel extends Model {
    declare id: BigId;
    declare name: string;
    declare description: string | null;
}

export function initRoleModel(sequelize: Sequelize) {
    RoleModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },
            description: { type: DataTypes.TEXT, allowNull: true },
        },
        { sequelize, tableName: "roles", timestamps: false, underscored: true }
    );
}
