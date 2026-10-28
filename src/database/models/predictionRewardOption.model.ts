import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
} from "sequelize";

/**
 * Récompense fixe proposée pour une option d'une prédiction
 * (ex. RACE_WINNER : HAM → 100 points si correct, STR → 300 points si correct).
 *
 * Ce n'est PAS une cote : aucun montant n'est engagé, la valeur est simplement le
 * nombre de points de championnat gagnés si le pronostic est correct.
 * `optionValue = '*'` sert de valeur par défaut (pilote absent du classement…).
 */
export class PredictionRewardOptionModel extends Model<
	InferAttributes<PredictionRewardOptionModel>,
	InferCreationAttributes<PredictionRewardOptionModel>
> {
	declare id: CreationOptional<number>;
	declare predictionId: number;
	declare optionValue: string;
	declare rewardPoints: number;
	declare partialRewardPoints: number | null;
	declare ruleVersion: string;
	declare computedFrom: Record<string, unknown> | null;
	declare createdAt: CreationOptional<Date>;

	static initModel(sequelize: Sequelize) {
		PredictionRewardOptionModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				predictionId: { type: DataTypes.INTEGER, allowNull: false, field: "prediction_id" },
				optionValue: { type: DataTypes.STRING(100), allowNull: false, field: "option_value" },
				rewardPoints: { type: DataTypes.INTEGER, allowNull: false, field: "reward_points" },
				partialRewardPoints: { type: DataTypes.INTEGER, allowNull: true, field: "partial_reward_points" },
				ruleVersion: { type: DataTypes.STRING(32), allowNull: false, field: "rule_version" },
				computedFrom: { type: DataTypes.JSONB, allowNull: true, field: "computed_from" },
				createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at", defaultValue: DataTypes.NOW },
			},
			{ sequelize, tableName: "prediction_reward_options", timestamps: false, underscored: true },
		);
		return PredictionRewardOptionModel;
	}
}
