import { UsersService } from "./users.service";

const mockRepo = {
    findById:        jest.fn(),
    findPublicById:  jest.fn(),
    list:            jest.fn(),
    usernameExists:  jest.fn(),
    updateMe:        jest.fn(),
    adminUpdateUser: jest.fn(),
};

jest.mock("./users.repository", () => ({
    UsersRepository: jest.fn().mockImplementation(() => mockRepo),
}));

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
});
