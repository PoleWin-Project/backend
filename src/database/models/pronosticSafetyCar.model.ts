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

export class PronosticSafetyCarModel extends Model<
  InferAttributes<PronosticSafetyCarModel>,
  InferCreationAttributes<PronosticSafetyCarModel>
> {
  declare pronosticId: number;
  declare safetyCar: boolean;

  declare getPronostic: BelongsToGetAssociationMixin<PronosticModel>;
  declare pronostic?: PronosticModel;

  declare static associations: {
    pronostic: Association<PronosticSafetyCarModel, PronosticModel>;
  };

  static initModel(sequelize: Sequelize) {
    PronosticSafetyCarModel.init(
      {
        pronosticId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          field: "pronostic_id",
        },
        safetyCar: { type: DataTypes.BOOLEAN, allowNull: false, field: "safety_car" },
      },
      {
        sequelize,
        tableName: "pronostics_safety_car",
        timestamps: false,
        underscored: true,
      }
    );

    return PronosticSafetyCarModel;
  }
}
