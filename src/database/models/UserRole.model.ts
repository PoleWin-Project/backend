import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class UserRoleModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare roleId: BigId;
    declare createdAt: Date;
}

export function initUserRoleModel(sequelize: Sequelize) {
    UserRoleModel.init(
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
            roleId: {
                field: "role_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "user_roles",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["user_id", "role_id"],
                    name: "uq_user_roles",
                },
            ],
        }
    );
}
