// src/database/models/initModels.ts
import { Sequelize } from "sequelize";

import { UserModel } from "./user.model";
import { ProfileModel } from "./profile.model";
import { ConversationModel } from "./conversation.model";
import { MessageModel } from "./message.model";
import { PredictionModel } from "./prediction.model";
import { PronosticModel } from "./pronostic.model";
import { PronosticSafetyCarModel } from "./pronosticSafetyCar.model";
import { PronosticWinnerDriverModel } from "./pronosticWinnerDriver.model";
import { PronosticWinnerTeamModel } from "./pronosticWinnerTeam.model";
import { LeagueModel } from "./league.model";
import { LeagueMemberModel } from "./leagueMember.model";

export function initModels(sequelize: Sequelize) {

  UserModel.initModel(sequelize);
  ProfileModel.initModel(sequelize);
  ConversationModel.initModel(sequelize);
  MessageModel.initModel(sequelize);
  PredictionModel.initModel(sequelize);
  PronosticModel.initModel(sequelize);
  PronosticSafetyCarModel.initModel(sequelize);
  PronosticWinnerDriverModel.initModel(sequelize);
  PronosticWinnerTeamModel.initModel(sequelize);
  LeagueModel.initModel(sequelize);
  LeagueMemberModel.initModel(sequelize);

  UserModel.hasOne(ProfileModel, { as: "profile", foreignKey: "userId" });
  ProfileModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

  UserModel.hasMany(ConversationModel, {
    as: "conversationsAsUser1",
    foreignKey: "user1Id",
  });
  UserModel.hasMany(ConversationModel, {
    as: "conversationsAsUser2",
    foreignKey: "user2Id",
  });
  ConversationModel.belongsTo(UserModel, {
    as: "user1",
    foreignKey: "user1Id",
  });
  ConversationModel.belongsTo(UserModel, {
    as: "user2",
    foreignKey: "user2Id",
  });

  // messages
  ConversationModel.hasMany(MessageModel, {
    as: "messages",
    foreignKey: "conversationId",
  });
  MessageModel.belongsTo(ConversationModel, {
    as: "conversation",
    foreignKey: "conversationId",
  });

  UserModel.hasMany(MessageModel, {
    as: "messagesSent",
    foreignKey: "senderId",
  });
  MessageModel.belongsTo(UserModel, { as: "sender", foreignKey: "senderId" });

  // predictions <-> pronostics
  PredictionModel.hasMany(PronosticModel, {
    as: "pronostics",
    foreignKey: "predictionId",
  });
  PronosticModel.belongsTo(PredictionModel, {
    as: "prediction",
    foreignKey: "predictionId",
  });

  UserModel.hasMany(PronosticModel, { as: "pronostics", foreignKey: "userId" });
  PronosticModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

  // pronostics sub-tables (1-1 on pronostic_id)
  PronosticModel.hasOne(PronosticSafetyCarModel, {
    as: "safetyCar",
    foreignKey: "pronosticId",
  });
  PronosticSafetyCarModel.belongsTo(PronosticModel, {
    as: "pronostic",
    foreignKey: "pronosticId",
  });

  PronosticModel.hasOne(PronosticWinnerDriverModel, {
    as: "winnerDriver",
    foreignKey: "pronosticId",
  });
  PronosticWinnerDriverModel.belongsTo(PronosticModel, {
    as: "pronostic",
    foreignKey: "pronosticId",
  });

  PronosticModel.hasOne(PronosticWinnerTeamModel, {
    as: "winnerTeam",
    foreignKey: "pronosticId",
  });
  PronosticWinnerTeamModel.belongsTo(PronosticModel, {
    as: "pronostic",
    foreignKey: "pronosticId",
  });

  // leagues
  UserModel.hasMany(LeagueModel, {
    as: "ownedLeagues",
    foreignKey: "ownerUserId",
  });
  LeagueModel.belongsTo(UserModel, { as: "owner", foreignKey: "ownerUserId" });

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
  LeagueMemberModel.belongsTo(UserModel, { as: "user", foreignKey: "userId" });

  return {
    UserModel,
    ProfileModel,
    ConversationModel,
    MessageModel,
    PredictionModel,
    PronosticModel,
    PronosticSafetyCarModel,
    PronosticWinnerDriverModel,
    PronosticWinnerTeamModel,
    LeagueModel,
    LeagueMemberModel,
  };
}
