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
import type { UserModel } from "./User.model";
import type { BadgeModel } from "./badge.model";

export class UserBadgeModel extends Model<
	InferAttributes<UserBadgeModel>,
	InferCreationAttributes<UserBadgeModel>
> {
	declare id: CreationOptional<number>;
	declare userId: number;
	declare badgeId: number;
	declare awardedAt: CreationOptional<Date>;

	declare getUser: BelongsToGetAssociationMixin<UserModel>;
	declare getBadge: BelongsToGetAssociationMixin<BadgeModel>;

	declare user?: UserModel;
	declare badge?: BadgeModel;

	declare static associations: {
		user: Association<UserBadgeModel, UserModel>;
		badge: Association<UserBadgeModel, BadgeModel>;
	};

	static initModel(sequelize: Sequelize) {
		UserBadgeModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
				badgeId: { type: DataTypes.INTEGER, allowNull: false, field: "badge_id" },
				awardedAt: {
					type: DataTypes.DATE,
					allowNull: false,
					field: "awarded_at",
					defaultValue: DataTypes.NOW,
				},
			},
			{
				sequelize,
				tableName: "user_badges",
				timestamps: false,
				underscored: true,
				indexes: [
					{
						unique: true,
						fields: ["user_id", "badge_id"],
						name: "user_badges_user_badge_unique",
					},
				],
			}
		);

		return UserBadgeModel;
	}
}
