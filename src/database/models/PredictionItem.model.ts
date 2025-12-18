import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type PredictionItemAttributes = {
    id: string; // BIGINT => string safe
    predictionSetId: string;
    predictionRuleId: string;

    driverExternalId: string | null;
    teamExternalId: string | null;
    valueText: string | null;

    pointsEarned: number;
    createdAt: Date;
    updatedAt: Date;
};

type PredictionItemCreationAttributes = Optional<
    PredictionItemAttributes,
    | "id"
    | "driverExternalId"
    | "teamExternalId"
    | "valueText"
    | "pointsEarned"
    | "createdAt"
    | "updatedAt"
>;

export class PredictionItemModel
    extends Model<PredictionItemAttributes, PredictionItemCreationAttributes>
    implements PredictionItemAttributes
{
    declare id: string;
    declare predictionSetId: string;
    declare predictionRuleId: string;

    declare driverExternalId: string | null;
    declare teamExternalId: string | null;
    declare valueText: string | null;

    declare pointsEarned: number;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initPredictionItemModel(sequelize: Sequelize) {
    PredictionItemModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },

            predictionSetId: {
                field: "prediction_set_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },

            predictionRuleId: {
                field: "prediction_rule_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },

            driverExternalId: {
                field: "driver_external_id",
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            teamExternalId: {
                field: "team_external_id",
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            valueText: {
                field: "value_text",
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            pointsEarned: {
                field: "points_earned",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },

            createdAt: {
                field: "created_at",
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },

            updatedAt: {
                field: "updated_at",
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            sequelize,
            tableName: "prediction_items",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                {
                    unique: true,
                    name: "uq_prediction_items",
                    fields: ["prediction_set_id", "prediction_rule_id"],
                },
            ],
        }
    );

    return PredictionItemModel;
}
