import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	HasOneGetAssociationMixin,
	HasManyGetAssociationsMixin,
} from "sequelize";

import type { ProfileModel } from "./profile.model";
import type { ChannelMessageModel } from "./channelMessage.model";
import type { PronosticModel } from "./pronostic.model";
import type { LeagueModel } from "./League.model";
import type { LeagueMemberModel } from "./LeagueMember.model";
import type { UserBadgeModel } from "./userBadge.model";

export class UserModel extends Model<
	InferAttributes<UserModel>,
	InferCreationAttributes<UserModel>
> {
	declare id: CreationOptional<number>;
	declare email: string;
	declare username: string;
	declare passwordHash: string;

	declare role: CreationOptional<string>;
	declare isEmailVerified: CreationOptional<boolean>;
	declare googleId: CreationOptional<string | null>;
	declare appleId: CreationOptional<string | null>;
	declare lastLoginAt: Date | null;

	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;

	declare getProfile: HasOneGetAssociationMixin<ProfileModel>;
	declare getMessagesSent: HasManyGetAssociationsMixin<ChannelMessageModel>;
	declare getPronostics: HasManyGetAssociationsMixin<PronosticModel>;
	declare getOwnedLeagues: HasManyGetAssociationsMixin<LeagueModel>;
	declare getLeagueMemberships: HasManyGetAssociationsMixin<LeagueMemberModel>;
	declare getUserBadges: HasManyGetAssociationsMixin<UserBadgeModel>;

	declare profile?: ProfileModel;

	declare static associations: {
		profile: Association<UserModel, ProfileModel>;
		messagesSent: Association<UserModel, ChannelMessageModel>;
		pronostics: Association<UserModel, PronosticModel>;
		ownedLeagues: Association<UserModel, LeagueModel>;
		leagueMemberships: Association<UserModel, LeagueMemberModel>;
		userBadges: Association<UserModel, UserBadgeModel>;
	};

	static initModel(sequelize: Sequelize) {
		UserModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				email: { type: DataTypes.STRING, allowNull: false, unique: true },
				username: { type: DataTypes.STRING, allowNull: false, unique: true },
				passwordHash: {
					type: DataTypes.STRING,
					allowNull: false,
					field: "password_hash",
				},
				role: {
					type: DataTypes.STRING,
					allowNull: false,
					defaultValue: "user",
				},
				isEmailVerified: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
					field: "is_email_verified",
				},
				googleId: {
					type: DataTypes.STRING,
					allowNull: true,
					unique: true,
					field: "google_id",
				},
				appleId: {
					type: DataTypes.STRING,
					allowNull: true,
					unique: true,
					field: "apple_id",
				},
				lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: "last_login_at" },
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
				tableName: "users",
				timestamps: true,
				createdAt: "createdAt",
				updatedAt: "updatedAt",
				underscored: true,
			}
		);

		return UserModel;
	}
}
