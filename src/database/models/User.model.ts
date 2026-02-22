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
import type { ConversationModel } from "./conversation.model";
import type { MessageModel } from "./message.model";
import type { PronosticModel } from "./pronostic.model";
import type { LeagueModel } from "./League.model";
import type { LeagueMemberModel } from "./LeagueMember.model";

export class UserModel extends Model<
	InferAttributes<UserModel>,
	InferCreationAttributes<UserModel>
> {
	declare id: CreationOptional<number>;
	declare email: string;
	declare username: string;
	declare passwordHash: string;

	declare isEmailVerified: CreationOptional<boolean>;
	declare lastLoginAt: Date | null;

	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;

	declare getProfile: HasOneGetAssociationMixin<ProfileModel>;
	declare getConversationsAsUser1: HasManyGetAssociationsMixin<ConversationModel>;
	declare getConversationsAsUser2: HasManyGetAssociationsMixin<ConversationModel>;
	declare getMessagesSent: HasManyGetAssociationsMixin<MessageModel>;
	declare getPronostics: HasManyGetAssociationsMixin<PronosticModel>;
	declare getOwnedLeagues: HasManyGetAssociationsMixin<LeagueModel>;
	declare getLeagueMemberships: HasManyGetAssociationsMixin<LeagueMemberModel>;

	declare profile?: ProfileModel;

	declare static associations: {
		profile: Association<UserModel, ProfileModel>;
		conversationsAsUser1: Association<UserModel, ConversationModel>;
		conversationsAsUser2: Association<UserModel, ConversationModel>;
		messagesSent: Association<UserModel, MessageModel>;
		pronostics: Association<UserModel, PronosticModel>;
		ownedLeagues: Association<UserModel, LeagueModel>;
		leagueMemberships: Association<UserModel, LeagueMemberModel>;
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
				isEmailVerified: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
					field: "is_email_verified",
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
