import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type CarAssetAttributes = {
    id: string; // BIGINT => string (safe en JS)
    seasonYear: number;
    teamExternalId: string;
    topViewImageUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    createdAt: Date;
    updatedAt: Date;
};

type CarAssetCreationAttributes = Optional<
    CarAssetAttributes,
    | "id"
    | "topViewImageUrl"
    | "primaryColor"
    | "secondaryColor"
    | "createdAt"
    | "updatedAt"
>;

export class CarAssetModel
    extends Model<CarAssetAttributes, CarAssetCreationAttributes>
    implements CarAssetAttributes
{
    declare id: string;
    declare seasonYear: number;
    declare teamExternalId: string;
    declare topViewImageUrl: string | null;
    declare primaryColor: string | null;
    declare secondaryColor: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initCarAssetModel(sequelize: Sequelize) {
    CarAssetModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },

            seasonYear: {
                field: "season_year",
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            teamExternalId: {
                field: "team_external_id",
                type: DataTypes.STRING(100),
                allowNull: false,
            },

            topViewImageUrl: {
                field: "top_view_image_url",
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            primaryColor: {
                field: "primary_color",
                type: DataTypes.STRING(30),
                allowNull: true,
            },

            secondaryColor: {
                field: "secondary_color",
                type: DataTypes.STRING(30),
                allowNull: true,
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
            tableName: "car_assets",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                {
                    unique: true,
                    name: "uq_car_assets",
                    fields: ["season_year", "team_external_id"],
                },
            ],
        }
    );

    return CarAssetModel;
}