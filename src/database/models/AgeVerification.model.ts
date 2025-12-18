import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class AgeVerificationModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare birthDate: string;
    declare isVerified: boolean;
    declare method: string | null;
    declare verifiedAt: Date | null;
}

export function initAgeVerificationModel(sequelize: Sequelize) {
    AgeVerificationModel.init(
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
            birthDate: {
                field: "birth_date",
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            isVerified: {
                field: "is_verified",
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            method: { type: DataTypes.STRING(50), allowNull: true },
            verifiedAt: {
                field: "verified_at",
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            sequelize,
            tableName: "age_verifications",
            timestamps: false,
            underscored: true,
        }
    );
}
