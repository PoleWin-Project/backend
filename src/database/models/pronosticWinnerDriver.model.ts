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

export class PronosticWinnerDriverModel extends Model<
  InferAttributes<PronosticWinnerDriverModel>,
  InferCreationAttributes<PronosticWinnerDriverModel>
> {
  declare pronosticId: number;
  declare driverCode: string;

  declare getPronostic: BelongsToGetAssociationMixin<PronosticModel>;
  declare pronostic?: PronosticModel;

  declare static associations: {
    pronostic: Association<PronosticWinnerDriverModel, PronosticModel>;
  };

  static initModel(sequelize: Sequelize) {
    PronosticWinnerDriverModel.init(
      {
        pronosticId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          field: "pronostic_id",
        },
        driverCode: { type: DataTypes.STRING, allowNull: false, field: "driver_code" },
      },
      {
        sequelize,
        tableName: "pronostics_winner_driver",
        timestamps: false,
        underscored: true,
      }
    );

    return PronosticWinnerDriverModel;
  }
}
