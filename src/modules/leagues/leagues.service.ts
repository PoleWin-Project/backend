import { randomBytes } from "crypto";
import { UniqueConstraintError } from "sequelize";
import { httpErrors } from "../../common/errors/http";
import { LeagueMemberModel, LeagueModel, UserModel } from "../../database/models";
import { sequelize } from "../../database/sequelize";

export class LeaguesService {
    async create(userId: number, name: string, seasonYear = new Date().getFullYear()) {
        return sequelize.transaction(async (tx) => {
            const league = await LeagueModel.create({
                name, ownerUserId: userId, seasonYear, inviteCode: randomBytes(16).toString("hex"),
            }, { transaction: tx });
            await LeagueMemberModel.create({ leagueId: league.id, userId }, { transaction: tx });
            return league;
        });
    }

    async listMine(userId: number) {
        const memberships = await LeagueMemberModel.findAll({
            where: { userId },
            include: [{ model: LeagueModel, as: "league" }],
            order: [["joinedAt", "DESC"]],
        });
        return memberships.map((membership) => membership.league);
    }

    async join(userId: number, inviteCode: string) {
        const league = await LeagueModel.findOne({ where: { inviteCode } });
        if (!league) throw httpErrors.notFound("League invitation not found");
        try {
            await LeagueMemberModel.create({ leagueId: league.id, userId });
        } catch (error) {
            if (error instanceof UniqueConstraintError) throw httpErrors.conflict("Already a league member");
            throw error;
        }
        return league;
    }

    async members(userId: number, leagueId: number) {
        const membership = await LeagueMemberModel.findOne({ where: { leagueId, userId } });
        if (!membership) throw httpErrors.notFound("League not found");
        return LeagueMemberModel.findAll({
            where: { leagueId },
            attributes: ["userId", "joinedAt"],
            include: [{ model: UserModel, as: "user", attributes: ["id", "username"] }],
            order: [["joinedAt", "ASC"]],
        });
    }

    async leave(userId: number, leagueId: number) {
        const league = await LeagueModel.findByPk(leagueId);
        if (!league) throw httpErrors.notFound("League not found");
        if (league.ownerUserId === userId) throw httpErrors.conflict("League owner cannot leave");
        const deleted = await LeagueMemberModel.destroy({ where: { leagueId, userId } });
        if (!deleted) throw httpErrors.notFound("League membership not found");
    }

    async delete(userId: number, leagueId: number) {
        const deleted = await LeagueModel.destroy({ where: { id: leagueId, ownerUserId: userId } });
        if (!deleted) throw httpErrors.notFound("League not found");
    }
}
