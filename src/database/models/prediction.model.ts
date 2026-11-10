import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	HasManyGetAssociationsMixin,
	BelongsToGetAssociationMixin,
} from "sequelize";
import type { PronosticModel } from "./pronostic.model";
import type { RaceSessionModel } from "./raceSession.model";
import type { PredictionRewardOptionModel } from "./predictionRewardOption.model";

export class PredictionModel extends Model<
	InferAttributes<PredictionModel>,
	InferCreationAttributes<PredictionModel>
> {
	declare id: CreationOptional<number>;
	declare sessionId: number;
	declare type: "POLE_POSITION" | "RACE_WINNER" | "FASTEST_LAP" | "DNF" | "SAFETY_CAR" | "SPRINT_WINNER" | "PODIUM";
	declare scope: string | null;
	declare closesAt: Date | null;
	declare winningValue: string | null;
	declare resultStatus: CreationOptional<"pending" | "provisional" | "corrected" | "final">;
	declare candidateWinningValue: CreationOptional<string | null>;
	declare candidateSeenAt: CreationOptional<Date | null>;
	declare resultSource: CreationOptional<string | null>;
	declare resultCheckedAt: CreationOptional<Date | null>;
	declare reconciliationUntil: CreationOptional<Date | null>;
	declare createdAt: CreationOptional<Date>;

	// ── Modèle « championship » ──────────────────────────────────────────────
	declare seasonId: CreationOptional<number | null>;
	declare rewardRuleVersion: CreationOptional<string | null>;
	declare resolvedAt: CreationOptional<Date | null>;
	// Annulation (remplace la suppression physique qui cascadait sur les pronostics).
	declare voidedAt: CreationOptional<Date | null>;

	declare getSession: BelongsToGetAssociationMixin<RaceSessionModel>;
	declare getPronostics: HasManyGetAssociationsMixin<PronosticModel>;

	declare session?: RaceSessionModel;
	declare pronostics?: PronosticModel[];
	declare rewardOptions?: PredictionRewardOptionModel[];

	declare static associations: {
		session: Association<PredictionModel, RaceSessionModel>;
		pronostics: Association<PredictionModel, PronosticModel>;
		rewardOptions: Association<PredictionModel, PredictionRewardOptionModel>;
	};

	static initModel(sequelize: Sequelize) {
		PredictionModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				sessionId: { type: DataTypes.INTEGER, allowNull: false, field: "session_id" },
				type: {
					type: DataTypes.STRING,
					allowNull: false,
					field: "title",
				},
				scope: { type: DataTypes.STRING, allowNull: true },
				closesAt: { type: DataTypes.DATE, allowNull: true, field: "closes_at" },
				winningValue: { type: DataTypes.STRING, allowNull: true, field: "winning_value" },
				resultStatus: {
					type: DataTypes.STRING(16),
					allowNull: false,
					defaultValue: "pending",
					field: "result_status",
				},
				candidateWinningValue: { type: DataTypes.STRING, allowNull: true, field: "candidate_winning_value" },
				candidateSeenAt: { type: DataTypes.DATE, allowNull: true, field: "candidate_seen_at" },
				resultSource: { type: DataTypes.STRING(64), allowNull: true, field: "result_source" },
				resultCheckedAt: { type: DataTypes.DATE, allowNull: true, field: "result_checked_at" },
				reconciliationUntil: { type: DataTypes.DATE, allowNull: true, field: "reconciliation_until" },
				seasonId: { type: DataTypes.INTEGER, allowNull: true, field: "season_id" },
				rewardRuleVersion: { type: DataTypes.STRING(32), allowNull: true, field: "reward_rule_version" },
				resolvedAt: { type: DataTypes.DATE, allowNull: true, field: "resolved_at" },
				voidedAt: { type: DataTypes.DATE, allowNull: true, field: "voided_at" },
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
