import type { Sequelize } from "sequelize";

import { UserModel, initUserModel } from "./User.model";
import { UserProfileModel, initUserProfileModel } from "./UserProfile.model";
import { RoleModel, initRoleModel } from "./Role.model";
import { UserRoleModel, initUserRoleModel } from "./UserRole.model";

import {
    PredictionRuleModel,
    initPredictionRuleModel,
} from "./PredictionRule.model";
import {
    PredictionContestModel,
    initPredictionContestModel,
} from "./PredictionContest.model";
import {
    PredictionSetModel,
    initPredictionSetModel,
} from "./PredictionSet.model";
import {
    PredictionItemModel,
    initPredictionItemModel,
} from "./PredictionItem.model";

import {
    UserSessionScoreModel,
    initUserSessionScoreModel,
} from "./UserSessionScore.model";
import {
    UserSeasonScoreModel,
    initUserSeasonScoreModel,
} from "./UserSeasonScore.model";

import { LeagueModel, initLeagueModel } from "./League.model";
import { LeagueMemberModel, initLeagueMemberModel } from "./LeagueMember.model";
import { LeagueScoreModel, initLeagueScoreModel } from "./LeagueScore.model";

import { ChatRoomModel, initChatRoomModel } from "./ChatRoom.model";
import { ChatMessageModel, initChatMessageModel } from "./ChatMessage.model";
import { ChatReactionModel, initChatReactionModel } from "./ChatReaction.model";

import { PollModel, initPollModel } from "./Poll.model";
import { PollOptionModel, initPollOptionModel } from "./PollOption.model";
import { PollVoteModel, initPollVoteModel } from "./PollVote.model";

import { UserStatModel, initUserStatModel } from "./UserStat.model";
import { BadgeModel, initBadgeModel } from "./Badge.model";
import { UserBadgeModel, initUserBadgeModel } from "./UserBadge.model";
import { XpEventModel, initXpEventModel } from "./XpEvent.model";

import {
    WaitlistSignupModel,
    initWaitlistSignupModel,
} from "./WaitlistSignup.model";
import { NotificationModel, initNotificationModel } from "./Notification.model";
import { UserSettingModel, initUserSettingModel } from "./UserSetting.model";

import { ReportModel, initReportModel } from "./Report.model";
import { BanModel, initBanModel } from "./Ban.model";
import { ConsentModel, initConsentModel } from "./Consent.model";
import {
    AgeVerificationModel,
    initAgeVerificationModel,
} from "./AgeVerification.model";

import { TrackAssetModel, initTrackAssetModel } from "./TrackAsset.model";
import { CarAssetModel, initCarAssetModel } from "./CarAsset.model";

export function initModels(sequelize: Sequelize) {
    // init models
    initUserModel(sequelize);
    initUserProfileModel(sequelize);
    initRoleModel(sequelize);
    initUserRoleModel(sequelize);

    initPredictionRuleModel(sequelize);
    initPredictionContestModel(sequelize);
    initPredictionSetModel(sequelize);
    initPredictionItemModel(sequelize);

    initUserSessionScoreModel(sequelize);
    initUserSeasonScoreModel(sequelize);

    initLeagueModel(sequelize);
    initLeagueMemberModel(sequelize);
    initLeagueScoreModel(sequelize);

    initChatRoomModel(sequelize);
    initChatMessageModel(sequelize);
    initChatReactionModel(sequelize);

    initPollModel(sequelize);
    initPollOptionModel(sequelize);
    initPollVoteModel(sequelize);

    initUserStatModel(sequelize);
    initBadgeModel(sequelize);
    initUserBadgeModel(sequelize);
    initXpEventModel(sequelize);

    initWaitlistSignupModel(sequelize);
    initNotificationModel(sequelize);
    initUserSettingModel(sequelize);

    initReportModel(sequelize);
    initBanModel(sequelize);
    initConsentModel(sequelize);
    initAgeVerificationModel(sequelize);

    initTrackAssetModel(sequelize);
    initCarAssetModel(sequelize);

    // =========================
    // Associations
    // =========================

    UserModel.hasOne(UserProfileModel, { as: "profile", foreignKey: "userId" });
    UserProfileModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

    UserModel.hasOne(UserSettingModel, {
        as: "settings",
        foreignKey: "userId",
    });
    UserSettingModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

    UserModel.hasOne(UserStatModel, { as: "stats", foreignKey: "userId" });
    UserStatModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

    UserModel.belongsToMany(RoleModel, {
        as: "roles",
        through: UserRoleModel,
        foreignKey: "userId",
        otherKey: "roleId",
    });
    RoleModel.belongsToMany(UserModel, {
        as: "users",
        through: UserRoleModel,
        foreignKey: "roleId",
        otherKey: "userId",
    });

    PredictionContestModel.hasMany(PredictionSetModel, {
        as: "sets",
        foreignKey: "contestId",
    });
    PredictionSetModel.belongsTo(PredictionContestModel, {
        as: "contest",
        foreignKey: "contestId",
    });

    UserModel.hasMany(PredictionSetModel, {
        as: "predictionSets",
        foreignKey: "userId",
    });
    PredictionSetModel.belongsTo(UserModel, {
        as: "user",
        foreignKey: "userId",
    });

    PredictionSetModel.hasMany(PredictionItemModel, {
        as: "items",
        foreignKey: "predictionSetId",
    });
    PredictionItemModel.belongsTo(PredictionSetModel, {
        as: "set",
        foreignKey: "predictionSetId",
    });

    PredictionRuleModel.hasMany(PredictionItemModel, {
        as: "items",
        foreignKey: "predictionRuleId",
    });
    PredictionItemModel.belongsTo(PredictionRuleModel, {
        as: "rule",
        foreignKey: "predictionRuleId",
    });

    UserModel.hasMany(UserSessionScoreModel, {
        as: "sessionScores",
        foreignKey: "userId",
    });
    UserSessionScoreModel.belongsTo(UserModel, {
        as: "user",
        foreignKey: "userId",
    });

    UserModel.hasMany(UserSeasonScoreModel, {
        as: "seasonScores",
        foreignKey: "userId",
    });
    UserSeasonScoreModel.belongsTo(UserModel, {
        as: "user",
        foreignKey: "userId",
    });

    UserModel.hasMany(LeagueModel, {
        as: "ownedLeagues",
        foreignKey: "ownerUserId",
    });
    LeagueModel.belongsTo(UserModel, {
        as: "owner",
        foreignKey: "ownerUserId",
    });

    LeagueModel.hasMany(LeagueMemberModel, {
        as: "members",
        foreignKey: "leagueId",
    });
    LeagueMemberModel.belongsTo(LeagueModel, {
        as: "league",
        foreignKey: "leagueId",
    });

    UserModel.hasMany(LeagueMemberModel, {
        as: "leagueMemberships",
        foreignKey: "userId",
    });
    LeagueMemberModel.belongsTo(UserModel, {
        as: "user",
        foreignKey: "userId",
    });

    LeagueModel.hasMany(LeagueScoreModel, {
        as: "scores",
        foreignKey: "leagueId",
    });
    LeagueScoreModel.belongsTo(LeagueModel, {
        as: "league",
        foreignKey: "leagueId",
    });

    UserModel.hasMany(LeagueScoreModel, {
        as: "leagueScores",
        foreignKey: "userId",
    });
    LeagueScoreModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

    LeagueModel.hasMany(ChatRoomModel, {
        as: "chatRooms",
        foreignKey: "leagueId",
    });
    ChatRoomModel.belongsTo(LeagueModel, {
        as: "league",
        foreignKey: "leagueId",
    });

    ChatRoomModel.hasMany(ChatMessageModel, {
        as: "messages",
        foreignKey: "roomId",
    });
    ChatMessageModel.belongsTo(ChatRoomModel, {
        as: "room",
        foreignKey: "roomId",
    });

    UserModel.hasMany(ChatMessageModel, {
        as: "messages",
        foreignKey: "userId",
    });
    ChatMessageModel.belongsTo(UserModel, {
        as: "author",
        foreignKey: "userId",
    });

    ChatMessageModel.belongsTo(ChatMessageModel, {
        as: "parent",
        foreignKey: "parentMessageId",
    });

    ChatMessageModel.hasMany(ChatReactionModel, {
        as: "reactions",
        foreignKey: "messageId",
    });
    ChatReactionModel.belongsTo(ChatMessageModel, {
        as: "message",
        foreignKey: "messageId",
    });
    UserModel.hasMany(ChatReactionModel, {
        as: "reactions",
        foreignKey: "userId",
    });
    ChatReactionModel.belongsTo(UserModel, {
        as: "user",
        foreignKey: "userId",
    });

    ChatRoomModel.hasMany(PollModel, { as: "polls", foreignKey: "roomId" });
    PollModel.belongsTo(ChatRoomModel, { as: "room", foreignKey: "roomId" });

    PollModel.belongsTo(ChatMessageModel, {
        as: "message",
        foreignKey: "messageId",
    });
    PollModel.belongsTo(UserModel, {
        as: "creator",
        foreignKey: "createdByUserId",
    });

    PollModel.hasMany(PollOptionModel, { as: "options", foreignKey: "pollId" });
    PollOptionModel.belongsTo(PollModel, { as: "poll", foreignKey: "pollId" });

    PollModel.hasMany(PollVoteModel, { as: "votes", foreignKey: "pollId" });
    PollVoteModel.belongsTo(PollModel, { as: "poll", foreignKey: "pollId" });
    PollVoteModel.belongsTo(PollOptionModel, {
        as: "option",
        foreignKey: "optionId",
    });
    PollVoteModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

    UserModel.hasMany(UserBadgeModel, { as: "badges", foreignKey: "userId" });
    UserBadgeModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });
    BadgeModel.hasMany(UserBadgeModel, { as: "users", foreignKey: "badgeId" });
    UserBadgeModel.belongsTo(BadgeModel, {
        as: "badge",
        foreignKey: "badgeId",
    });

    UserModel.hasMany(XpEventModel, { as: "xpEvents", foreignKey: "userId" });
    XpEventModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

    UserModel.hasMany(NotificationModel, {
        as: "notifications",
        foreignKey: "userId",
    });
    NotificationModel.belongsTo(UserModel, {
        as: "user",
        foreignKey: "userId",
    });

    UserModel.hasMany(ReportModel, {
        as: "reportsMade",
        foreignKey: "reporterUserId",
    });
    ReportModel.belongsTo(UserModel, {
        as: "reporter",
        foreignKey: "reporterUserId",
    });
    ReportModel.belongsTo(UserModel, {
        as: "resolver",
        foreignKey: "resolvedByUserId",
    });

    UserModel.hasMany(BanModel, { as: "bans", foreignKey: "userId" });
    BanModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

    UserModel.hasMany(ConsentModel, { as: "consents", foreignKey: "userId" });
    ConsentModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

    UserModel.hasMany(AgeVerificationModel, {
        as: "ageVerifications",
        foreignKey: "userId",
    });
    AgeVerificationModel.belongsTo(UserModel, {
        as: "user",
        foreignKey: "userId",
    });

    return {
        UserModel,
        UserProfileModel,
        RoleModel,
        UserRoleModel,
        PredictionRuleModel,
        PredictionContestModel,
        PredictionSetModel,
        PredictionItemModel,
        UserSessionScoreModel,
        UserSeasonScoreModel,
        LeagueModel,
        LeagueMemberModel,
        LeagueScoreModel,
        ChatRoomModel,
        ChatMessageModel,
        ChatReactionModel,
        PollModel,
        PollOptionModel,
        PollVoteModel,
        UserStatModel,
        BadgeModel,
        UserBadgeModel,
        XpEventModel,
        WaitlistSignupModel,
        NotificationModel,
        UserSettingModel,
        ReportModel,
        BanModel,
        ConsentModel,
        AgeVerificationModel,
        TrackAssetModel,
        CarAssetModel,
    };
}

export {
    UserModel,
    UserProfileModel,
    RoleModel,
    UserRoleModel,
    PredictionRuleModel,
    PredictionContestModel,
    PredictionSetModel,
    PredictionItemModel,
    UserSessionScoreModel,
    UserSeasonScoreModel,
    LeagueModel,
    LeagueMemberModel,
    LeagueScoreModel,
    ChatRoomModel,
    ChatMessageModel,
    ChatReactionModel,
    PollModel,
    PollOptionModel,
    PollVoteModel,
    UserStatModel,
    BadgeModel,
    UserBadgeModel,
    XpEventModel,
    WaitlistSignupModel,
    NotificationModel,
    UserSettingModel,
    ReportModel,
    BanModel,
    ConsentModel,
    AgeVerificationModel,
    TrackAssetModel,
    CarAssetModel,
};
