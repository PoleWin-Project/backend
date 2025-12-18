import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class WaitlistSignupModel extends Model {
    declare id: BigId;
    declare email: string;
    declare source: string | null;
    declare referralCode: string | null;
    declare createdAt: Date;
}

export function initWaitlistSignupModel(sequelize: Sequelize) {
    WaitlistSignupModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            email: { type: DataTypes.STRING(255), allowNull: false },
            source: { type: DataTypes.STRING(50), allowNull: true },
            referralCode: {
                field: "referral_code",
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "waitlist_signups",
            timestamps: false,
            underscored: true,
        }
    );
}
