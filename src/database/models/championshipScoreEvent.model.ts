import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
} from "sequelize";

export type ScoreEventSource = "pronostic" | "admin_correction";

/**
 * Journal APPEND-ONLY des points de championnat.
 * - source_type = 'pronostic'        → bon pronostic (points > 0, garanti en base)
 * - source_type = 'admin_correction' → correction d'arbitrage tracée (created_by)
 * UNIQUE (source_type, source_id) : un pronostic ne rapporte qu'une seule fois.
 * Ne jamais UPDATE / DELETE ces lignes : corriger = ajouter un événement.
 */
export class ChampionshipScoreEventModel extends Model<
	InferAttributes<ChampionshipScoreEventModel>,
	InferCreationAttributes<ChampionshipScoreEventModel>
> {
	declare id: CreationOptional<number>;
	declare seasonId: number;
	declare userId: number;
	declare sourceType: ScoreEventSource;
	declare sourceId: number;
	declare points: number;
	declare reason: string | null;
	declare createdBy: number | null;
	declare createdAt: CreationOptional<Date>;

	static initModel(sequelize: Sequelize) {
		ChampionshipScoreEventModel.init(
			{
				id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
				seasonId: { type: DataTypes.INTEGER, allowNull: false, field: "season_id" },
				userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
				sourceType: { type: DataTypes.STRING(32), allowNull: false, field: "source_type" },
				sourceId: { type: DataTypes.BIGINT, allowNull: false, field: "source_id" },
				points: { type: DataTypes.INTEGER, allowNull: false },
				reason: { type: DataTypes.STRING(255), allowNull: true },
				createdBy: { type: DataTypes.INTEGER, allowNull: true, field: "created_by" },
				createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at", defaultValue: DataTypes.NOW },
			},
			{ sequelize, tableName: "championship_score_events", timestamps: false, underscored: true },
		);
		return ChampionshipScoreEventModel;
	}
}
