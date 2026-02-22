import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
  Association,
  BelongsToGetAssociationMixin,
} from "sequelize";
import type { PronosticModel } from "./pronostic.model";

export class PronosticWinnerTeamModel extends Model<
  InferAttributes<PronosticWinnerTeamModel>,
  InferCreationAttributes<PronosticWinnerTeamModel>
> {
  declare pronosticId: number;
  declare teamCode: string;

  declare getPronostic: BelongsToGetAssociationMixin<PronosticModel>;
  declare pronostic?: PronosticModel;

  declare static associations: {
    pronostic: Association<PronosticWinnerTeamModel, PronosticModel>;
  };

  static initModel(sequelize: Sequelize) {
    PronosticWinnerTeamModel.init(
      {
        pronosticId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          field: "pronostic_id",
        },
        teamCode: { type: DataTypes.STRING, allowNull: false, field: "team_code" },
      },
      {
        sequelize,
        tableName: "pronostics_winner_team",
        timestamps: false,
        underscored: true,
      }
    );

    return PronosticWinnerTeamModel;
  }
}
