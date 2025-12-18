import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class LeagueMemberModel extends Model {
    declare id: BigId;
    declare leagueId: BigId;
    declare userId: BigId;
    declare role: string;
    declare joinedAt: Date;
}

export function initLeagueMemberModel(sequelize: Sequelize) {
    LeagueMemberModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            leagueId: {
                field: "league_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            role: {
                type: DataTypes.STRING(30),
                allowNull: false,
                defaultValue: "member",
            },
            joinedAt: { field: "joined_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "league_members",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["league_id", "user_id"],
                    name: "uq_league_members",
                },
                { fields: ["user_id"], name: "idx_league_members_user" },
            ],
        }
    );
}
