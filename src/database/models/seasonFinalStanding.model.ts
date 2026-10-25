import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
} from "sequelize";

/**
 * Archive figée du classement de fin de saison (dont la Saison Bêta).
 * Écrite une seule fois, à l'archivage de la saison ; lecture seule ensuite.
 */
export class SeasonFinalStandingModel extends Model<
	InferAttributes<SeasonFinalStandingModel>,
	InferCreationAttributes<SeasonFinalStandingModel>
> {
	declare seasonId: number;
	declare userId: number;
	declare finalRank: number;
	declare finalScore: number;
	declare participants: number;
	declare stats: CreationOptional<Record<string, unknown>>;
	declare archivedAt: CreationOptional<Date>;

	static initModel(sequelize: Sequelize) {
		SeasonFinalStandingModel.init(
			{
				seasonId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: "season_id" },
				userId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: "user_id" },
				finalRank: { type: DataTypes.INTEGER, allowNull: false, field: "final_rank" },
				finalScore: { type: DataTypes.INTEGER, allowNull: false, field: "final_score" },
				participants: { type: DataTypes.INTEGER, allowNull: false },
				stats: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
				archivedAt: { type: DataTypes.DATE, allowNull: false, field: "archived_at", defaultValue: DataTypes.NOW },
			},
			{ sequelize, tableName: "season_final_standings", timestamps: false, underscored: true },
		);
		return SeasonFinalStandingModel;
	}
}
