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
import type { PronosticDetailModel } from "./pronosticDetail.model";

export class PronosticModel extends Model<
	InferAttributes<PronosticModel>,
	InferCreationAttributes<PronosticModel>
> {
	declare id: CreationOptional<number>;
	declare userId: number;
	declare predictionId: number;
	declare pointsStaked: CreationOptional<number>;
	declare pointsEarned: CreationOptional<number>;
	declare status: CreationOptional<string>;

	// ── Modèle « championship » (sans mise) ─────────────────────────────────
	// 'legacy_stake' = ancien pari de la Saison Bêta (pointsStaked / pointsEarned) ;
	// 'fixed_reward' = nouveau pronostic gratuit à récompense fixe.
	declare scoringModel: CreationOptional<"legacy_stake" | "fixed_reward">;
	declare seasonId: CreationOptional<number | null>;
	// Récompense figée au moment de la validation (jamais recalculée ensuite).
	declare rewardPointsSnapshot: CreationOptional<number | null>;
	declare partialRewardPointsSnapshot: CreationOptional<number | null>;
	declare rewardRuleVersion: CreationOptional<string | null>;
	declare submittedAt: CreationOptional<Date | null>;
	declare resolvedAt: CreationOptional<Date | null>;
	// Points de championnat effectivement attribués (0 si incorrect, jamais négatif).
	declare championshipPointsAwarded: CreationOptional<number>;

	declare getUser: BelongsToGetAssociationMixin<UserModel>;
	declare getPrediction: BelongsToGetAssociationMixin<PredictionModel>;
	declare getDetail: HasOneGetAssociationMixin<PronosticDetailModel>;

	declare user?: UserModel;
	declare prediction?: PredictionModel;
	declare detail?: PronosticDetailModel;

	declare static associations: {
		user: Association<PronosticModel, UserModel>;
		prediction: Association<PronosticModel, PredictionModel>;
		detail: Association<PronosticModel, PronosticDetailModel>;
	};

	static initModel(sequelize: Sequelize) {
		PronosticModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
				predictionId: { type: DataTypes.INTEGER, allowNull: false, field: "prediction_id" },
				pointsStaked: {
					type: DataTypes.INTEGER,
					allowNull: false,
					defaultValue: 0,
					field: "points_staked",
				},
				pointsEarned: {
					type: DataTypes.INTEGER,
					allowNull: false,
					defaultValue: 0,
					field: "points_earned",
				},
				status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
				scoringModel: {
					type: DataTypes.STRING(16),
					allowNull: false,
					defaultValue: "legacy_stake",
					field: "scoring_model",
				},
				seasonId: { type: DataTypes.INTEGER, allowNull: true, field: "season_id" },
				rewardPointsSnapshot: { type: DataTypes.INTEGER, allowNull: true, field: "reward_points_snapshot" },
				partialRewardPointsSnapshot: {
					type: DataTypes.INTEGER,
					allowNull: true,
					field: "partial_reward_points_snapshot",
				},
				rewardRuleVersion: { type: DataTypes.STRING(32), allowNull: true, field: "reward_rule_version" },
				submittedAt: { type: DataTypes.DATE, allowNull: true, field: "submitted_at" },
				resolvedAt: { type: DataTypes.DATE, allowNull: true, field: "resolved_at" },
				championshipPointsAwarded: {
					type: DataTypes.INTEGER,
					allowNull: false,
					defaultValue: 0,
					field: "championship_points_awarded",
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
						fields: ["user_id", "prediction_id"],
						name: "pronostics_user_prediction_unique",
					},
					{ fields: ["prediction_id"], name: "pronostics_prediction_idx" },
					{ fields: ["user_id"], name: "pronostics_user_idx" },
				],
			}
		);

		return PronosticModel;
	}
}
