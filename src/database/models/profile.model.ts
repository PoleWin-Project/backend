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

export class ProfileModel extends Model<
	InferAttributes<ProfileModel>,
	InferCreationAttributes<ProfileModel>
> {
	declare id: CreationOptional<number>;
	declare userId: number;

	declare displayName: string | null;
	declare avatarUrl: string | null;
	declare bio: string | null;

	declare points: CreationOptional<number>;

	declare favoriteTeamCode: string | null;
	declare favoriteDriverCode: string | null;

	declare isProfilePublic: CreationOptional<boolean>;

	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;

	declare getUser: BelongsToGetAssociationMixin<UserModel>;
	declare user?: UserModel;

	declare static associations: {
		user: Association<ProfileModel, UserModel>;
	};

	static initModel(sequelize: Sequelize) {
		ProfileModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				userId: {
					type: DataTypes.INTEGER,
					allowNull: false,
					unique: true,
					field: "user_id",
				},
				displayName: {
					type: DataTypes.STRING,
					allowNull: true,
					field: "display_name",
				},
				avatarUrl: {
					type: DataTypes.STRING,
					allowNull: true,
					field: "avatar_url",
				},
				bio: { type: DataTypes.TEXT, allowNull: true },
				points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
				favoriteTeamCode: {
					type: DataTypes.STRING,
					allowNull: true,
					field: "favorite_team_code",
				},
				favoriteDriverCode: {
					type: DataTypes.STRING,
					allowNull: true,
					field: "favorite_driver_code",
				},
				isProfilePublic: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: true,
					field: "is_profile_public",
				},
				createdAt: {
					type: DataTypes.DATE,
					allowNull: false,
					field: "created_at",
					defaultValue: DataTypes.NOW,
				},
				updatedAt: {
					type: DataTypes.DATE,
					allowNull: false,
					field: "updated_at",
					defaultValue: DataTypes.NOW,
				},
			},
			{
				sequelize,
				tableName: "profiles",
				timestamps: true,
				createdAt: "createdAt",
				updatedAt: "updatedAt",
				underscored: true,
			},
		);

		return ProfileModel;
	}
}
