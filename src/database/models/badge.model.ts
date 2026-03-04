import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	HasManyGetAssociationsMixin,
} from "sequelize";
import type { BadgeRuleModel } from "./badgeRule.model";
import type { UserBadgeModel } from "./userBadge.model";

export class BadgeModel extends Model<
	InferAttributes<BadgeModel>,
	InferCreationAttributes<BadgeModel>
> {
	declare id: CreationOptional<number>;
	declare name: string;
	declare code: string | null;
	declare description: string | null;
	declare imageUrl: string | null;
	declare rarity: string | null;
	declare createdAt: CreationOptional<Date>;

	declare getRules: HasManyGetAssociationsMixin<BadgeRuleModel>;
	declare getUserBadges: HasManyGetAssociationsMixin<UserBadgeModel>;

	declare rules?: BadgeRuleModel[];
	declare userBadges?: UserBadgeModel[];

	declare static associations: {
		rules: Association<BadgeModel, BadgeRuleModel>;
		userBadges: Association<BadgeModel, UserBadgeModel>;
	};

	static initModel(sequelize: Sequelize) {
		BadgeModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				name: { type: DataTypes.STRING, allowNull: false },
				code: { type: DataTypes.STRING, allowNull: true },
				description: { type: DataTypes.TEXT, allowNull: true },
				imageUrl: { type: DataTypes.STRING, allowNull: true, field: "image_url" },
				rarity: { type: DataTypes.STRING, allowNull: true },
				createdAt: {
					type: DataTypes.DATE,
					allowNull: false,
					field: "created_at",
					defaultValue: DataTypes.NOW,
				},
			},
			{
				sequelize,
				tableName: "badges",
				timestamps: false,
				underscored: true,
			}
		);

		return BadgeModel;
	}
}
