import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { LeagueMemberModel, LeagueModel, ProfileModel, UserModel } from "../../database/models";
import type { LeagueScoringMode } from "./leagues.dto";

export interface LeagueSummaryRow {
    id: number;
    name: string;
    ownerUserId: number;
    seasonYear: number;
    inviteCode: string;
    scoringMode: LeagueScoringMode;
    createdAt: Date;
    memberCount: number;
    ownerUsername: string;
}

export class LeaguesRepository {
    async listForUser(userId: number): Promise<LeagueSummaryRow[]> {
        return sequelize.query<LeagueSummaryRow>(`
            SELECT l.id,
                   l.name,
                   l.owner_user_id AS "ownerUserId",
                   l.season_year AS "seasonYear",
                   l.invite_code AS "inviteCode",
                   l.scoring_mode AS "scoringMode",
                   l.created_at AS "createdAt",
                   COUNT(all_members.id)::int AS "memberCount",
                   owner.username AS "ownerUsername"
              FROM league_members mine
              JOIN leagues l ON l.id = mine.league_id
              JOIN users owner ON owner.id = l.owner_user_id
              LEFT JOIN league_members all_members ON all_members.league_id = l.id
             WHERE mine.user_id = :userId
             GROUP BY l.id, owner.username
             ORDER BY l.created_at DESC, l.id DESC
        `, { replacements: { userId }, type: QueryTypes.SELECT });
    }

    findById(id: number, transaction?: Transaction) {
        return LeagueModel.findByPk(id, {
            include: [{
                model: UserModel,
                as: "owner",
                attributes: ["id", "username"],
                include: [{ model: ProfileModel, as: "profile", attributes: ["displayName"] }],
            }],
            transaction,
        });
    }

    findByInviteCode(inviteCode: string, transaction?: Transaction) {
        return LeagueModel.findOne({ where: { inviteCode }, transaction });
    }

    countOwned(ownerUserId: number, transaction?: Transaction) {
        return LeagueModel.count({ where: { ownerUserId }, transaction });
    }

    countMembers(leagueId: number, transaction?: Transaction) {
        return LeagueMemberModel.count({ where: { leagueId }, transaction });
    }

    findMembership(leagueId: number, userId: number, transaction?: Transaction) {
        return LeagueMemberModel.findOne({ where: { leagueId, userId }, transaction });
    }

    listMembers(leagueId: number) {
        return LeagueMemberModel.findAll({
            where: { leagueId },
            attributes: ["id", "userId", "joinedAt", "pointsBaseline"],
            include: [{
                model: UserModel,
                as: "user",
                attributes: ["id", "username"],
                include: [{
                    model: ProfileModel,
                    as: "profile",
                    attributes: ["displayName", "avatarUrl", "points"],
                }],
            }],
            order: [["joinedAt", "ASC"], ["userId", "ASC"]],
        });
    }

    create(data: { name: string; ownerUserId: number; seasonYear: number; inviteCode: string; scoringMode: LeagueScoringMode }, transaction: Transaction) {
        return LeagueModel.create(data, { transaction });
    }

    addMember(leagueId: number, userId: number, pointsBaseline: number, transaction: Transaction) {
        return LeagueMemberModel.create({ leagueId, userId, pointsBaseline }, { transaction });
    }

    async getLegacyPoints(userId: number, transaction?: Transaction): Promise<number> {
        const profile = await ProfileModel.findOne({ where: { userId }, attributes: ["points"], transaction });
        return profile?.points ?? 0;
    }

    async removeMember(leagueId: number, userId: number, transaction?: Transaction) {
        return LeagueMemberModel.destroy({ where: { leagueId, userId }, transaction });
    }

    async updateName(league: LeagueModel, name: string) {
        return league.update({ name });
    }

    async updateInviteCode(league: LeagueModel, inviteCode: string) {
        return league.update({ inviteCode });
    }

    async delete(league: LeagueModel) {
        await league.destroy();
    }
}
