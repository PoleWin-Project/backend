import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Model,
  Sequelize,
  Association,
  HasManyGetAssociationsMixin,
} from "sequelize";
import type { PronosticModel } from "./pronostic.model";

export class PredictionModel extends Model<
  InferAttributes<PredictionModel>,
  InferCreationAttributes<PredictionModel>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare sessionExternalId: string | null;
  declare seasonYear: number | null;
  declare opensAt: Date | null;
  declare closesAt: Date | null;
  declare createdAt: CreationOptional<Date>;

  declare getPronostics: HasManyGetAssociationsMixin<PronosticModel>;
  declare pronostics?: PronosticModel[];

  declare static associations: {
    pronostics: Association<PredictionModel, PronosticModel>;
  };

  static initModel(sequelize: Sequelize) {
    PredictionModel.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        title: { type: DataTypes.STRING, allowNull: false },
        sessionExternalId: { type: DataTypes.STRING, allowNull: true, field: "session_external_id" },
        seasonYear: { type: DataTypes.INTEGER, allowNull: true, field: "season_year" },
        opensAt: { type: DataTypes.DATE, allowNull: true, field: "opens_at" },
        closesAt: { type: DataTypes.DATE, allowNull: true, field: "closes_at" },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "created_at",
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "predictions",
        timestamps: false,
        underscored: true,
      }
    );

    return PredictionModel;
  }
}
