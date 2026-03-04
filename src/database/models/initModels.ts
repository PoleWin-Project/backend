import { Sequelize } from "sequelize";

import { UserModel } from "./User.model";
import { ProfileModel } from "./profile.model";
import { RaceSessionModel } from "./raceSession.model";
import { PredictionModel } from "./prediction.model";
import { PronosticModel } from "./pronostic.model";
import { PronosticDetailModel } from "./pronosticDetail.model";
import { ChatChannelModel } from "./chatChannel.model";
import { MessageModel } from "./message.model";
import { LeagueModel } from "./League.model";
import { LeagueMemberModel } from "./LeagueMember.model";
import { BadgeModel } from "./badge.model";
import { BadgeRuleModel } from "./badgeRule.model";
import { UserBadgeModel } from "./userBadge.model";

export function initModels(sequelize: Sequelize) {

	UserModel.initModel(sequelize);
	ProfileModel.initModel(sequelize);
	RaceSessionModel.initModel(sequelize);
	PredictionModel.initModel(sequelize);
	PronosticModel.initModel(sequelize);
	PronosticDetailModel.initModel(sequelize);
	ChatChannelModel.initModel(sequelize);
	MessageModel.initModel(sequelize);
	LeagueModel.initModel(sequelize);
	LeagueMemberModel.initModel(sequelize);
	BadgeModel.initModel(sequelize);
	BadgeRuleModel.initModel(sequelize);
	UserBadgeModel.initModel(sequelize);

	UserModel.hasOne(ProfileModel, { as: "profile", foreignKey: "userId" });
	ProfileModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

	RaceSessionModel.hasMany(PredictionModel, { as: "predictions", foreignKey: "sessionId" });
	PredictionModel.belongsTo(RaceSessionModel, { as: "session", foreignKey: "sessionId" });

	RaceSessionModel.hasMany(ChatChannelModel, { as: "chatChannels", foreignKey: "sessionId" });
	ChatChannelModel.belongsTo(RaceSessionModel, { as: "session", foreignKey: "sessionId" });

	PredictionModel.hasMany(PronosticModel, { as: "pronostics", foreignKey: "predictionId" });
	PronosticModel.belongsTo(PredictionModel, { as: "prediction", foreignKey: "predictionId" });

	UserModel.hasMany(PronosticModel, { as: "pronostics", foreignKey: "userId" });
	PronosticModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

	PronosticModel.hasOne(PronosticDetailModel, { as: "detail", foreignKey: "pronosticId" });
	PronosticDetailModel.belongsTo(PronosticModel, { as: "pronostic", foreignKey: "pronosticId" });

	ChatChannelModel.hasMany(MessageModel, { as: "messages", foreignKey: "channelId" });
	MessageModel.belongsTo(ChatChannelModel, { as: "channel", foreignKey: "channelId" });

	UserModel.hasMany(MessageModel, { as: "messagesSent", foreignKey: "senderId" });
	MessageModel.belongsTo(UserModel, { as: "sender", foreignKey: "senderId" });

	UserModel.hasMany(LeagueModel, { as: "ownedLeagues", foreignKey: "ownerUserId" });
	LeagueModel.belongsTo(UserModel, { as: "owner", foreignKey: "ownerUserId" });

	LeagueModel.hasMany(LeagueMemberModel, { as: "members", foreignKey: "leagueId" });
	LeagueMemberModel.belongsTo(LeagueModel, { as: "league", foreignKey: "leagueId" });

	UserModel.hasMany(LeagueMemberModel, { as: "leagueMemberships", foreignKey: "userId" });
	LeagueMemberModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

	BadgeModel.hasMany(BadgeRuleModel, { as: "rules", foreignKey: "badgeId" });
	BadgeRuleModel.belongsTo(BadgeModel, { as: "badge", foreignKey: "badgeId" });

	BadgeModel.hasMany(UserBadgeModel, { as: "userBadges", foreignKey: "badgeId" });
	UserBadgeModel.belongsTo(BadgeModel, { as: "badge", foreignKey: "badgeId" });

	UserModel.hasMany(UserBadgeModel, { as: "userBadges", foreignKey: "userId" });
	UserBadgeModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

	return {
		UserModel,
		ProfileModel,
		RaceSessionModel,
		PredictionModel,
		PronosticModel,
		PronosticDetailModel,
		ChatChannelModel,
		MessageModel,
		LeagueModel,
		LeagueMemberModel,
		BadgeModel,
		BadgeRuleModel,
		UserBadgeModel,
	};
}
