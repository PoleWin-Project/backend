const mockRepo = {
    findById:        jest.fn(),
    findPublicById:  jest.fn(),
    list:            jest.fn(),
    usernameExists:  jest.fn(),
    updateMe:        jest.fn(),
    adminUpdateUser: jest.fn(),
    searchPublic:    jest.fn(),
    delete:          jest.fn(),
};

jest.mock("./users.repository", () => ({
    UsersRepository: jest.fn().mockImplementation(() => mockRepo),
}));

const mockFriendsRepo = {
    countFriends: jest.fn(),
};

jest.mock("../friends/friends.repository", () => ({
    FriendsRepository: jest.fn().mockImplementation(() => mockFriendsRepo),
}));

const mockPronosticModel = {
    findAll: jest.fn(),
};

jest.mock("../../database/models", () => ({
    PronosticModel: mockPronosticModel,
}));

import { UsersService } from "./users.service";

describe("UsersService", () => {
    let service: UsersService;

    beforeEach(() => {
        service = new UsersService();
    });

    describe("getMe", () => {
        it("returns user when found", async () => {
            const fakeUser = { id: 1, email: "a@b.com" } as any;
            mockRepo.findById.mockResolvedValue(fakeUser);

            await expect(service.getMe(1)).resolves.toBe(fakeUser);
        });

        it("throws 404 when user not found", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(service.getMe(99)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── getPublicProfile ────────────────────────────────────────────────────────

    describe("getPublicProfile", () => {
        it("returns public profile when found", async () => {
            const fakeProfile = { id: "1", username: "test" } as any;
            mockRepo.findPublicById.mockResolvedValue(fakeProfile);

            await expect(service.getPublicProfile("1")).resolves.toBe(fakeProfile);
        });

        it("throws 404 when not found", async () => {
            mockRepo.findPublicById.mockResolvedValue(null);

            await expect(service.getPublicProfile("99")).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── listUsers ───────────────────────────────────────────────────────────────

    describe("listUsers", () => {
        it("returns paginated list with hasMore flag", async () => {
            const fakeUser = { id: 1 } as any;
            mockRepo.list.mockResolvedValue({ rows: [fakeUser], count: 5 });

            const result = await service.listUsers({ limit: 2, offset: 0 });

            expect(result).toEqual({
                items:   [fakeUser],
                total:   5,
                limit:   2,
                offset:  0,
                hasMore: true,
            });
        });

        it("sets hasMore to false when all items returned", async () => {
            mockRepo.list.mockResolvedValue({ rows: [{ id: 1 }] as any, count: 1 });

            const result = await service.listUsers({ limit: 10, offset: 0 });

            expect(result.hasMore).toBe(false);
        });
    });

    // ── updateMe ────────────────────────────────────────────────────────────────

    describe("updateMe", () => {
        it("updates and returns user", async () => {
            const updated = { id: 1, username: "newname" } as any;
            mockRepo.usernameExists.mockResolvedValue(false);
            mockRepo.updateMe.mockResolvedValue(updated);

            await expect(service.updateMe(1, { username: "newname" })).resolves.toBe(updated);
        });

        it("throws 409 when username already taken", async () => {
            mockRepo.usernameExists.mockResolvedValue(true);

            await expect(service.updateMe(1, { username: "taken" })).rejects.toMatchObject({
                statusCode: 409,
            });
        });

        it("throws 404 when user not found", async () => {
            mockRepo.usernameExists.mockResolvedValue(false);
            mockRepo.updateMe.mockResolvedValue(null);

            await expect(service.updateMe(99, {})).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── adminUpdateUser ─────────────────────────────────────────────────────────

    describe("adminUpdateUser", () => {
        it("returns updated user", async () => {
            const updated = { id: 1, roles: ["admin"] } as any;
            mockRepo.adminUpdateUser.mockResolvedValue(updated);

            await expect(service.adminUpdateUser(1, { roles: ["admin"] } as any)).resolves.toBe(updated);
        });

        it("throws 404 when user not found", async () => {
            mockRepo.adminUpdateUser.mockResolvedValue(null);

            await expect(service.adminUpdateUser(99, {} as any)).rejects.toMatchObject({
                statusCode: 404,
            });
        });
    });

    // ── getMyStats ──────────────────────────────────────────────────────────────

    describe("getMyStats", () => {
        it("calcule les stats depuis les pronostics", async () => {
            mockPronosticModel.findAll.mockResolvedValue([
                { status: "won",  count: "3", staked: "150", earned: "300" },
                { status: "lost", count: "2", staked: "100", earned: "0" },
            ]);

            const result = await service.getMyStats(1);

            expect(result.won).toBe(3);
            expect(result.lost).toBe(2);
            expect(result.total).toBe(5);
            expect(result.totalStaked).toBe(250);
            expect(result.totalEarned).toBe(300);
            expect(result.netGain).toBe(50);
            expect(result.winRate).toBe(60);
        });

        it("retourne des zéros si aucun pronostic", async () => {
            mockPronosticModel.findAll.mockResolvedValue([]);

            const result = await service.getMyStats(1);

            expect(result.total).toBe(0);
            expect(result.winRate).toBe(0);
        });

        it("compte les pronostics en attente", async () => {
            mockPronosticModel.findAll.mockResolvedValue([
                { status: "submitted",             count: "2", staked: "50",  earned: "0" },
                { status: "awaiting_verification", count: "1", staked: "30",  earned: "0" },
                { status: "draft",                 count: "1", staked: "20",  earned: "0" },
            ]);

            const result = await service.getMyStats(1);

            expect(result.pending).toBe(4);
            expect(result.won).toBe(0);
            expect(result.lost).toBe(0);
        });

        it("traite staked/earned null comme 0", async () => {
            mockPronosticModel.findAll.mockResolvedValue([
                { status: "won", count: "1", staked: null, earned: null },
            ]);

            const result = await service.getMyStats(1);

            expect(result.totalStaked).toBe(0);
            expect(result.totalEarned).toBe(0);
        });
    });

    // ── searchUsers ─────────────────────────────────────────────────────────────

    describe("searchUsers", () => {
        it("retourne les utilisateurs correspondants", async () => {
            const fakeUsers = [{ id: 1, username: "test" }] as any;
            mockRepo.searchPublic.mockResolvedValue(fakeUsers);

            const result = await service.searchUsers("test");

            expect(result).toBe(fakeUsers);
            expect(mockRepo.searchPublic).toHaveBeenCalledWith("test", 20);
        });

        it("retourne [] si la recherche est vide", async () => {
            const result = await service.searchUsers("");
            expect(result).toEqual([]);
        });

        it("retourne [] si la recherche ne contient que des espaces", async () => {
            const result = await service.searchUsers("   ");
            expect(result).toEqual([]);
        });
    });

    // ── deleteMe ────────────────────────────────────────────────────────────────

    describe("deleteMe", () => {
        it("supprime l'utilisateur et retourne true", async () => {
            mockRepo.delete.mockResolvedValue(true);

            await expect(service.deleteMe(1)).resolves.toBe(true);
        });

        it("throws 404 si l'utilisateur n'existe pas", async () => {
            mockRepo.delete.mockResolvedValue(false);

            await expect(service.deleteMe(99)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── getPublicFriendsCount ────────────────────────────────────────────────────

    describe("getPublicFriendsCount", () => {
        it("retourne le nombre d'amis", async () => {
            mockFriendsRepo.countFriends.mockResolvedValue(7);

            const result = await service.getPublicFriendsCount(1);

            expect(result).toBe(7);
            expect(mockFriendsRepo.countFriends).toHaveBeenCalledWith(1);
        });
    });
});
