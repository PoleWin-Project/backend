import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class TrackAssetModel extends Model {
    declare id: BigId;
    declare circuitExternalId: string;
    declare name: string | null;
    declare topViewImageUrl: string | null;
    declare svgPath: string | null;
    declare thumbnailUrl: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export function initTrackAssetModel(sequelize: Sequelize) {
    TrackAssetModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            circuitExternalId: {
                field: "circuit_external_id",
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            name: { type: DataTypes.STRING(120), allowNull: true },
            topViewImageUrl: {
                field: "top_view_image_url",
                type: DataTypes.STRING(500),
                allowNull: true,
            },
            svgPath: {
                field: "svg_path",
                type: DataTypes.TEXT,
                allowNull: true,
            },
            thumbnailUrl: {
                field: "thumbnail_url",
                type: DataTypes.STRING(500),
                allowNull: true,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
            updatedAt: { field: "updated_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "track_assets",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["circuit_external_id"],
                    name: "uq_track_assets",
                },
            ],
        }
    );
}
