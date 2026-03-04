import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	BelongsToGetAssociationMixin,
} from "sequelize";
import type { BadgeModel } from "./badge.model";

export class BadgeRuleModel extends Model<
	InferAttributes<BadgeRuleModel>,
	InferCreationAttributes<BadgeRuleModel>
> {
	declare id: CreationOptional<number>;
	declare badgeId: number;
	declare ruleType: string;
	declare threshold: number | null;
	declare comparisonType: string | null;

	declare getBadge: BelongsToGetAssociationMixin<BadgeModel>;
	declare badge?: BadgeModel;

	declare static associations: {
		badge: Association<BadgeRuleModel, BadgeModel>;
	};

	static initModel(sequelize: Sequelize) {
		BadgeRuleModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				badgeId: { type: DataTypes.INTEGER, allowNull: false, field: "badge_id" },
				ruleType: { type: DataTypes.STRING, allowNull: false, field: "rule_type" },
				threshold: { type: DataTypes.INTEGER, allowNull: true },
				comparisonType: { type: DataTypes.STRING, allowNull: true, field: "comparison_type" },
			},
			{
				sequelize,
				tableName: "badge_rules",
				timestamps: false,
				underscored: true,
			}
		);

		return BadgeRuleModel;
	}
}
