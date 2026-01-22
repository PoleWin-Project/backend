// src/database/models/leagueMember.model.ts
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Model,
  Sequelize,
  Association,
  BelongsToGetAssociationMixin,
} from "sequelize";
import type { LeagueModel } from "./league.model";
import type { UserModel } from "./user.model";

export class LeagueMemberModel extends Model<
  InferAttributes<LeagueMemberModel>,
  InferCreationAttributes<LeagueMemberModel>
> {
  declare id: CreationOptional<number>;
  declare leagueId: number;
  declare userId: number;
  declare joinedAt: CreationOptional<Date>;

  // Associations
  declare getLeague: BelongsToGetAssociationMixin<LeagueModel>;
  declare getUser: BelongsToGetAssociationMixin<UserModel>;

  declare league?: LeagueModel;
  declare user?: UserModel;

  declare static associations: {
    league: Association<LeagueMemberModel, LeagueModel>;
    user: Association<LeagueMemberModel, UserModel>;
  };

  static initModel(sequelize: Sequelize) {
    LeagueMemberModel.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        leagueId: { type: DataTypes.INTEGER, allowNull: false, field: "league_id" },
        userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
        joinedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "joined_at",
          defaultValue: DataTypes.NOW,
        },
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
            name: "league_members_league_user_unique",
          },
        ],
      }
    );

    return LeagueMemberModel;
  }
}
