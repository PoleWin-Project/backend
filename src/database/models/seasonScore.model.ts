import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
} from "sequelize";

/**
 * Cache du classement d'une saison : un total de points de championnat par
 * (saison, utilisateur). Mis à jour UNIQUEMENT par ChampionshipService, dans la
 * même transaction que l'insertion de l'événement correspondant.
 * Invariant : points = SUM(championship_score_events.points) de la saison.
 */
export class SeasonScoreModel extends Model<
	InferAttributes<SeasonScoreModel>,
	InferCreationAttributes<SeasonScoreModel>
> {
	declare seasonId: number;
	declare userId: number;
	declare points: CreationOptional<number>;
	declare correctCount: CreationOptional<number>;
	declare resolvedCount: CreationOptional<number>;
	declare lastScoredAt: CreationOptional<Date | null>;
	declare updatedAt: CreationOptional<Date>;

	static initModel(sequelize: Sequelize) {
		SeasonScoreModel.init(
			{
				seasonId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: "season_id" },
				userId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: "user_id" },
				points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
				correctCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "correct_count" },
				resolvedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "resolved_count" },
				lastScoredAt: { type: DataTypes.DATE, allowNull: true, field: "last_scored_at" },
				updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at", defaultValue: DataTypes.NOW },
			},
			{ sequelize, tableName: "season_scores", timestamps: false, underscored: true },
		);
		return SeasonScoreModel;
	}
}
