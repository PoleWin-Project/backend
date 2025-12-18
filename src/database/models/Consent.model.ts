import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class ConsentModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare type: string;
    declare version: string | null;
    declare acceptedAt: Date;
    declare ipAddress: string | null;
}

export function initConsentModel(sequelize: Sequelize) {
    ConsentModel.init(
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
            version: { type: DataTypes.STRING(50), allowNull: true },
            acceptedAt: { field: "accepted_at", type: DataTypes.DATE },
            ipAddress: {
                field: "ip_address",
                type: DataTypes.STRING(64),
                allowNull: true,
            },
        },
        {
            sequelize,
            tableName: "consents",
            timestamps: false,
            underscored: true,
        }
    );
}
