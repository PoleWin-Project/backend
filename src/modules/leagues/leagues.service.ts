import { randomInt } from "crypto";
import { Transaction } from "sequelize";
import { httpErrors } from "../../common/errors/http";
import { isChampionshipMode } from "../../config/env";
import { sequelize } from "../../database/sequelize";
import { championshipService } from "../championship/championship.service";
import { seasonsService } from "../seasons/seasons.service";
import { LeaguesRepository } from "./leagues.repository";
import type { LeagueScoringMode } from "./leagues.dto";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_OWNED_LEAGUES = 10;
const MAX_MEMBERS = 100;

function newInviteCode(): string {
    let code = "PW";
    for (let i = 0; i < 6; i += 1) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
    return code;
}

function normalizeCode(code: string): string {
    return code.replace(/[\s-]/g, "").toUpperCase();
}

export class LeaguesService {
    constructor(private readonly repo = new LeaguesRepository()) {}

    async list(userId: number) {
        const rows = await this.repo.listForUser(userId);
        return rows.map(row => ({
            ...row,
            role: row.ownerUserId === userId ? "owner" as const : "member" as const,
        }));
    }

    async create(userId: number, name: string, scoringMode: LeagueScoringMode = "season") {
        const leagueId = await sequelize.transaction(async transaction => {
            const owned = await this.repo.countOwned(userId, transaction);
            if (owned >= MAX_OWNED_LEAGUES) {
                throw httpErrors.conflict(`Tu peux diriger au maximum ${MAX_OWNED_LEAGUES} Écuries.`, "LEAGUE_LIMIT_REACHED");
            }

            const season = await seasonsService.getActiveSeason(transaction);
            const seasonYear = season?.startsAt.getUTCFullYear() ?? new Date().getUTCFullYear();
            const inviteCode = await this.generateUniqueInviteCode(transaction);
            const pointsBaseline = scoringMode === "from_join" ? await this.currentPoints(userId, transaction) : 0;
            const league = await this.repo.create({ name, ownerUserId: userId, seasonYear, inviteCode, scoringMode }, transaction);
            await this.repo.addMember(league.id, userId, pointsBaseline, transaction);
            return league.id;
        });
        return this.get(leagueId, userId);
    }

    async join(userId: number, rawInviteCode: string) {
        const inviteCode = normalizeCode(rawInviteCode);
        const result = await sequelize.transaction(async transaction => {
            const league = await this.repo.findByInviteCode(inviteCode, transaction);
            if (!league) throw httpErrors.notFound("Code d’invitation invalide.", "LEAGUE_INVITE_NOT_FOUND");

            const existing = await this.repo.findMembership(league.id, userId, transaction);
            if (existing) return { leagueId: league.id, ownerUserId: league.ownerUserId, joined: false };

            const memberCount = await this.repo.countMembers(league.id, transaction);
            if (memberCount >= MAX_MEMBERS) {
                throw httpErrors.conflict("Cette Écurie a atteint sa capacité maximale.", "LEAGUE_FULL");
            }
            const pointsBaseline = league.scoringMode === "from_join" ? await this.currentPoints(userId, transaction) : 0;
            await this.repo.addMember(league.id, userId, pointsBaseline, transaction);
            return { leagueId: league.id, ownerUserId: league.ownerUserId, joined: true };
        });

        return { ...result, league: await this.get(result.leagueId, userId) };
    }

    async get(leagueId: number, userId: number) {
        const league = await this.requireLeague(leagueId);
        await this.assertMember(leagueId, userId);
        const memberships = await this.repo.listMembers(leagueId);
        const plainMembers = memberships.flatMap(membership => {
            const user = membership.user;
            if (!user) return [];
            return [{
                id: user.id,
                userId: user.id,
                username: user.username,
                displayName: user.profile?.displayName ?? null,
                avatarUrl: user.profile?.avatarUrl ?? null,
                points: user.profile?.points ?? 0,
                pointsBaseline: membership.pointsBaseline ?? 0,
                joinedAt: membership.joinedAt,
                isOwner: user.id === league.ownerUserId,
            }];
        });

        if (isChampionshipMode()) {
            const scores = await championshipService.getActiveSeasonPoints(plainMembers.map(member => member.userId));
            for (const member of plainMembers) member.points = scores.get(member.userId) ?? 0;
        }

        if (league.scoringMode === "from_join") {
            for (const member of plainMembers) member.points = Math.max(0, member.points - member.pointsBaseline);
        }

        plainMembers.sort((a, b) => b.points - a.points || a.joinedAt.getTime() - b.joinedAt.getTime());
        const members = plainMembers.map(({ pointsBaseline: _pointsBaseline, ...member }, index) => ({ ...member, rank: index + 1 }));
        const myRank = members.find(member => member.userId === userId)?.rank ?? null;
        const owner = league.owner as any;

        return {
            id: league.id,
            name: league.name,
            ownerUserId: league.ownerUserId,
            ownerUsername: owner?.username ?? null,
            seasonYear: league.seasonYear,
            inviteCode: league.inviteCode,
            scoringMode: league.scoringMode,
            createdAt: league.createdAt,
            memberCount: members.length,
            myRank,
            canManage: league.ownerUserId === userId,
            members,
        };
    }

    async update(leagueId: number, userId: number, name: string) {
        const league = await this.requireOwner(leagueId, userId);
        await this.repo.updateName(league, name);
        return this.get(leagueId, userId);
    }

    async regenerateInvite(leagueId: number, userId: number) {
        const league = await this.requireOwner(leagueId, userId);
        const inviteCode = await this.generateUniqueInviteCode();
        await this.repo.updateInviteCode(league, inviteCode);
        return { inviteCode };
    }

    async leave(leagueId: number, userId: number) {
        const league = await this.requireLeague(leagueId);
        if (league.ownerUserId === userId) {
            throw httpErrors.conflict("Le propriétaire doit supprimer l’Écurie.", "OWNER_CANNOT_LEAVE");
        }
        const removed = await this.repo.removeMember(leagueId, userId);
        if (!removed) throw httpErrors.notFound("Tu ne fais pas partie de cette Écurie.", "LEAGUE_MEMBER_NOT_FOUND");
    }

    async removeMember(leagueId: number, ownerUserId: number, memberUserId: number) {
        const league = await this.requireOwner(leagueId, ownerUserId);
        if (memberUserId === league.ownerUserId) {
            throw httpErrors.badRequest("Le propriétaire ne peut pas être retiré.", "OWNER_CANNOT_BE_REMOVED");
        }
        const removed = await this.repo.removeMember(leagueId, memberUserId);
        if (!removed) throw httpErrors.notFound("Membre introuvable.", "LEAGUE_MEMBER_NOT_FOUND");
    }

    async delete(leagueId: number, userId: number) {
        const league = await this.requireOwner(leagueId, userId);
        await this.repo.delete(league);
    }

    async assertMember(leagueId: number, userId: number) {
        const membership = await this.repo.findMembership(leagueId, userId);
        if (!membership) throw httpErrors.forbidden("Cette Écurie est privée.", "LEAGUE_MEMBERS_ONLY");
    }

    private async requireLeague(leagueId: number) {
        if (!Number.isInteger(leagueId) || leagueId <= 0) throw httpErrors.badRequest("Identifiant d’Écurie invalide.");
        const league = await this.repo.findById(leagueId);
        if (!league) throw httpErrors.notFound("Écurie introuvable.", "LEAGUE_NOT_FOUND");
        return league;
    }

    private async requireOwner(leagueId: number, userId: number) {
        const league = await this.requireLeague(leagueId);
        if (league.ownerUserId !== userId) {
            throw httpErrors.forbidden("Seul le propriétaire peut effectuer cette action.", "LEAGUE_OWNER_ONLY");
        }
        return league;
    }

    private async generateUniqueInviteCode(transaction?: Transaction): Promise<string> {
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const code = newInviteCode();
            if (!await this.repo.findByInviteCode(code, transaction)) return code;
        }
        throw httpErrors.serviceUnavailable("Impossible de générer un code d’invitation. Réessaie.");
    }

    private async currentPoints(userId: number, transaction?: Transaction): Promise<number> {
        if (!isChampionshipMode()) return this.repo.getLegacyPoints(userId, transaction);
        const scores = await championshipService.getActiveSeasonPoints([userId]);
        return scores.get(userId) ?? 0;
    }
}
