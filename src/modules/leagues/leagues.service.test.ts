jest.mock("../../database/sequelize", () => ({
    sequelize: {
        transaction: jest.fn((cb: (tx: object) => unknown) => cb({})),
    },
}));

const mockIsChampionshipMode = jest.fn(() => true);
jest.mock("../../config/env", () => ({
    isChampionshipMode: () => mockIsChampionshipMode(),
}));

const mockGetActiveSeason = jest.fn();
jest.mock("../seasons/seasons.service", () => ({
    seasonsService: { getActiveSeason: (...args: unknown[]) => mockGetActiveSeason(...args) },
}));

const mockGetActiveSeasonPoints = jest.fn();
jest.mock("../championship/championship.service", () => ({
    championshipService: {
        getActiveSeasonPoints: (...args: unknown[]) => mockGetActiveSeasonPoints(...args),
    },
}));

import { LeaguesService } from "./leagues.service";

const repo = {
    listForUser: jest.fn(),
    findById: jest.fn(),
    findByInviteCode: jest.fn(),
    countOwned: jest.fn(),
    countMembers: jest.fn(),
    findMembership: jest.fn(),
    listMembers: jest.fn(),
    getLegacyPoints: jest.fn(),
    create: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateName: jest.fn(),
    updateInviteCode: jest.fn(),
    delete: jest.fn(),
};

describe("LeaguesService", () => {
    let service: LeaguesService;

    beforeEach(() => {
        service = new LeaguesService(repo as any);
        mockIsChampionshipMode.mockReturnValue(true);
        mockGetActiveSeasonPoints.mockResolvedValue(new Map());
        repo.findMembership.mockResolvedValue({ id: 1 });
    });

    it("marque correctement les Écuries dirigées et rejointes", async () => {
        repo.listForUser.mockResolvedValue([
            { id: 1, ownerUserId: 42, name: "Pole Squad" },
            { id: 2, ownerUserId: 7, name: "Virage 7" },
        ]);

        await expect(service.list(42)).resolves.toEqual([
            expect.objectContaining({ id: 1, role: "owner" }),
            expect.objectContaining({ id: 2, role: "member" }),
        ]);
    });

    it("classe les membres avec les points de la saison active", async () => {
        repo.findById.mockResolvedValue({
            id: 3,
            name: "Scuderia Test",
            ownerUserId: 10,
            owner: { username: "boss" },
            seasonYear: 2026,
            inviteCode: "PWTEST42",
            scoringMode: "season",
            createdAt: new Date("2026-01-01T00:00:00Z"),
        });
        repo.listMembers.mockResolvedValue([
            {
                id: 1,
                joinedAt: new Date("2026-01-01T00:00:00Z"),
                user: { id: 10, username: "boss", profile: { displayName: "Boss", avatarUrl: null, points: 999 } },
            },
            {
                id: 2,
                joinedAt: new Date("2026-01-02T00:00:00Z"),
                user: { id: 20, username: "rookie", profile: { displayName: null, avatarUrl: null, points: 1 } },
            },
        ]);
        mockGetActiveSeasonPoints.mockResolvedValue(new Map([[10, 18], [20, 35]]));

        const result = await service.get(3, 10);

        expect(mockGetActiveSeasonPoints).toHaveBeenCalledWith([10, 20]);
        expect(result.members.map(member => [member.userId, member.points, member.rank])).toEqual([
            [20, 35, 1],
            [10, 18, 2],
        ]);
        expect(result).toMatchObject({ memberCount: 2, myRank: 2, canManage: true });
    });

    it("refuse l'accès au classement aux non-membres", async () => {
        repo.findMembership.mockResolvedValue(null);

        await expect(service.assertMember(3, 99)).rejects.toMatchObject({
            statusCode: 403,
            code: "LEAGUE_MEMBERS_ONLY",
        });
    });

    it("ajoute un pilote avec un code normalisé", async () => {
        const league = { id: 3, ownerUserId: 10, scoringMode: "from_join" };
        repo.findByInviteCode.mockResolvedValue(league);
        repo.findMembership
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 9 });
        repo.countMembers.mockResolvedValue(4);
        repo.addMember.mockResolvedValue({ id: 9 });
        repo.findById.mockResolvedValue({
            ...league,
            name: "Scuderia Test",
            owner: { username: "boss" },
            seasonYear: 2026,
            inviteCode: "PW7K4X2A",
            createdAt: new Date(),
        });
        repo.listMembers.mockResolvedValue([]);
        mockGetActiveSeasonPoints.mockResolvedValue(new Map([[20, 55]]));

        const result = await service.join(20, "pw-7k4x2a");

        expect(repo.findByInviteCode).toHaveBeenCalledWith("PW7K4X2A", {});
        expect(repo.addMember).toHaveBeenCalledWith(3, 20, 55, {});
        expect(result.joined).toBe(true);
    });

    it("empêche le propriétaire de quitter sa propre Écurie", async () => {
        repo.findById.mockResolvedValue({ id: 3, ownerUserId: 10 });

        await expect(service.leave(3, 10)).rejects.toMatchObject({
            statusCode: 409,
            code: "OWNER_CANNOT_LEAVE",
        });
        expect(repo.removeMember).not.toHaveBeenCalled();
    });

    it("crée l'Écurie et inscrit automatiquement son propriétaire", async () => {
        repo.countOwned.mockResolvedValue(0);
        mockGetActiveSeason.mockResolvedValue({ startsAt: new Date("2026-03-01T00:00:00Z") });
        repo.findByInviteCode.mockResolvedValue(null);
        repo.create.mockResolvedValue({ id: 8 });
        repo.addMember.mockResolvedValue({ id: 1 });
        repo.findById.mockResolvedValue({
            id: 8,
            name: "Full Send Racing",
            ownerUserId: 42,
            owner: { username: "alex" },
            seasonYear: 2026,
            inviteCode: "PWABC234",
            createdAt: new Date(),
        });
        repo.listMembers.mockResolvedValue([]);
        mockGetActiveSeasonPoints.mockResolvedValue(new Map([[42, 120]]));

        await service.create(42, "Full Send Racing", "from_join");

        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: "Full Send Racing",
            ownerUserId: 42,
            seasonYear: 2026,
            scoringMode: "from_join",
            inviteCode: expect.stringMatching(/^PW[A-Z2-9]{6}$/),
        }), {});
        expect(repo.addMember).toHaveBeenCalledWith(8, 42, 120, {});
    });

    it("affiche uniquement les points gagnés depuis l'arrivée en mode nouveau championnat", async () => {
        repo.findById.mockResolvedValue({
            id: 3,
            name: "Fresh Start",
            ownerUserId: 10,
            owner: { username: "boss" },
            seasonYear: 2026,
            inviteCode: "PWFRESH1",
            scoringMode: "from_join",
            createdAt: new Date(),
        });
        repo.listMembers.mockResolvedValue([{
            id: 1,
            pointsBaseline: 80,
            joinedAt: new Date(),
            user: { id: 10, username: "boss", profile: { displayName: null, avatarUrl: null, points: 999 } },
        }]);
        mockGetActiveSeasonPoints.mockResolvedValue(new Map([[10, 105]]));

        const result = await service.get(3, 10);

        expect(result.members[0].points).toBe(25);
        expect(result.scoringMode).toBe("from_join");
    });
});
