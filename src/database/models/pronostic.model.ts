import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Model,
  Sequelize,
  Association,
  BelongsToGetAssociationMixin,
  HasOneGetAssociationMixin,
} from "sequelize";
import type { UserModel } from "./User.model";
import type { PredictionModel } from "./prediction.model";
import type { PronosticSafetyCarModel } from "./pronosticSafetyCar.model";
import type { PronosticWinnerDriverModel } from "./pronosticWinnerDriver.model";
import type { PronosticWinnerTeamModel } from "./pronosticWinnerTeam.model";

export class PronosticModel extends Model<
  InferAttributes<PronosticModel>,
  InferCreationAttributes<PronosticModel>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare predictionId: number;

  declare type: string;
  declare status: CreationOptional<string>;
  declare lockedAt: Date | null;
  declare pointsEarned: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;

  declare getUser: BelongsToGetAssociationMixin<UserModel>;
  declare getPrediction: BelongsToGetAssociationMixin<PredictionModel>;

  declare getSafetyCar: HasOneGetAssociationMixin<PronosticSafetyCarModel>;
  declare getWinnerDriver: HasOneGetAssociationMixin<PronosticWinnerDriverModel>;
  declare getWinnerTeam: HasOneGetAssociationMixin<PronosticWinnerTeamModel>;

  declare user?: UserModel;
  declare prediction?: PredictionModel;
  declare safetyCar?: PronosticSafetyCarModel;
  declare winnerDriver?: PronosticWinnerDriverModel;
  declare winnerTeam?: PronosticWinnerTeamModel;

  declare static associations: {
    user: Association<PronosticModel, UserModel>;
    prediction: Association<PronosticModel, PredictionModel>;
    safetyCar: Association<PronosticModel, PronosticSafetyCarModel>;
    winnerDriver: Association<PronosticModel, PronosticWinnerDriverModel>;
    winnerTeam: Association<PronosticModel, PronosticWinnerTeamModel>;
  };

  static initModel(sequelize: Sequelize) {
    PronosticModel.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
        predictionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "prediction_id",
        },
        type: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
        lockedAt: { type: DataTypes.DATE, allowNull: true, field: "locked_at" },
        pointsEarned: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "points_earned",
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "created_at",
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "pronostics",
        timestamps: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["user_id", "prediction_id", "type"],
            name: "pronostics_user_prediction_type_unique",
          },
          { fields: ["prediction_id"], name: "pronostics_prediction_idx" },
          { fields: ["user_id"], name: "pronostics_user_idx" },
        ],
      }
    );

    return PronosticModel;
  }
}
