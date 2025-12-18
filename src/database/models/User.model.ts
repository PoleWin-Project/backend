import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class UserModel extends Model {
    declare id: BigId;
    declare email: string;
    declare username: string;
    declare passwordHash: string | null;
    declare dateOfBirth: string | null;
    declare country: string | null;
    declare language: string | null;
    declare isEmailVerified: boolean;
    declare isActive: boolean;
    declare lastLoginAt: Date | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initUserModel(sequelize: Sequelize) {
    UserModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },
            username: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },
            passwordHash: {
                field: "password_hash",
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            dateOfBirth: {
                field: "date_of_birth",
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            country: { type: DataTypes.STRING(100), allowNull: true },
            language: { type: DataTypes.STRING(20), allowNull: true },
            isEmailVerified: {
                field: "is_email_verified",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isActive: {
                field: "is_active",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            lastLoginAt: {
                field: "last_login_at",
                type: DataTypes.DATE,
                allowNull: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "users",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
        }
    );
}
