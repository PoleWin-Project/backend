import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class BanModel extends Model {
    declare id: BigId;
    declare userId: BigId;
    declare reason: string | null;
    declare bannedUntil: Date | null;
    declare createdAt: Date;
}

export function initBanModel(sequelize: Sequelize) {
    BanModel.init(
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
            reason: { type: DataTypes.TEXT, allowNull: true },
            bannedUntil: {
                field: "banned_until",
                type: DataTypes.DATE,
                allowNull: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
        },
        { sequelize, tableName: "bans", timestamps: false, underscored: true }
    );
}
