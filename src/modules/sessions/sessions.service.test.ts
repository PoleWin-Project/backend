import { SessionsService } from "./sessions.service";

const mockRepo = {
    findAll:  jest.fn(),
    findById: jest.fn(),
    create:   jest.fn(),
    update:   jest.fn(),
    delete:   jest.fn(),
    upsertFromOpenF1: jest.fn(),
};

jest.mock("./sessions.repository", () => ({
    SessionsRepository: jest.fn().mockImplementation(() => mockRepo),
}));

const mockGetSessions = jest.fn();
jest.mock("../openf1/openf1.service", () => ({
    OpenF1Service: jest.fn().mockImplementation(() => ({ getSessions: mockGetSessions })),
}));

describe("SessionsService", () => {
    let service: SessionsService;

    beforeEach(() => {
        service = new SessionsService();
        mockGetSessions.mockReset();
        mockRepo.upsertFromOpenF1.mockResolvedValue({ created: 0, updated: 20 });
    });

    describe("list", () => {
        it("returns paginated items", async () => {
            const fakeSession = { id: 1, name: "Australian GP" } as any;
            mockRepo.findAll.mockResolvedValue({ rows: [fakeSession], count: 1 });

            const result = await service.list({ limit: 20, offset: 0 });

            expect(result).toEqual({ items: [fakeSession], total: 1, limit: 20, offset: 0 });
        });

        it("refreshes a populated season before selecting upcoming sessions and caches the refresh", async () => {
            const calendar = [{ session_key: 42, country_name: "Bahrain" }];
            mockGetSessions.mockResolvedValue(calendar);
            mockRepo.findAll.mockResolvedValue({ rows: [{ name: "Bahrain - Race" }], count: 30 });
            const query = { upcoming: true, limit: 50, offset: 0 };

            const result = await service.list(query);
            await service.list(query);

            expect(result.items[0].name).toBe("Bahrain - Race");
            expect(mockGetSessions).toHaveBeenCalledTimes(1);
            expect(mockRepo.upsertFromOpenF1).toHaveBeenCalledWith(calendar);
            expect(mockRepo.upsertFromOpenF1.mock.invocationCallOrder[0])
                .toBeLessThan(mockRepo.findAll.mock.invocationCallOrder[0]!);
        });

        it("refreshes again after five minutes so schedule changes are picked up", async () => {
            const now = Date.now();
            const clock = jest.spyOn(Date, "now").mockReturnValue(now);
            try {
                mockGetSessions.mockResolvedValue([]);
                mockRepo.findAll.mockResolvedValue({ rows: [], count: 0 });
                const query = { upcoming: true, limit: 50, offset: 0 };
                await service.list(query);
                clock.mockReturnValue(now + 5 * 60 * 1000);
                await service.list(query);
                expect(mockGetSessions).toHaveBeenCalledTimes(2);
            } finally {
                clock.mockRestore();
            }
        });

        it("shares a refresh between concurrent requests", async () => {
            mockGetSessions.mockResolvedValue([]);
            mockRepo.findAll.mockResolvedValue({ rows: [], count: 0 });
            await Promise.all([1, 2].map(() => service.list({ upcoming: true, limit: 50, offset: 0 })));
            expect(mockGetSessions).toHaveBeenCalledTimes(1);
        });

        it("retries after an upstream failure and keeps stored sessions available", async () => {
            mockGetSessions.mockRejectedValueOnce(new Error("OpenF1 unavailable")).mockResolvedValue([]);
            mockRepo.findAll.mockResolvedValue({ rows: [{ id: 1 }], count: 1 });
            const query = { upcoming: true, limit: 50, offset: 0 };
            await expect(service.list(query)).resolves.toMatchObject({ total: 1 });
            await service.list(query);
            expect(mockGetSessions).toHaveBeenCalledTimes(2);
        });

        it("filters by type", async () => {
            mockRepo.findAll.mockResolvedValue({ rows: [], count: 0 });

            await service.list({ type: "Race", limit: 10, offset: 0 });

            expect(mockRepo.findAll).toHaveBeenCalledWith({ type: "Race", limit: 10, offset: 0 });
        });
    });

    // ── getById ─────────────────────────────────────────────────────────────────

    describe("getById", () => {
        it("returns session when found", async () => {
            const fakeSession = { id: 1 } as any;
            mockRepo.findById.mockResolvedValue(fakeSession);

            await expect(service.getById(1)).resolves.toBe(fakeSession);
        });

        it("throws 404 when session not found", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(service.getById(99)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── create ──────────────────────────────────────────────────────────────────

    describe("create", () => {
        it("delegates to repository and returns created session", async () => {
            const input = { name: "Monaco GP", type: "Race" as const } as any;
            const created = { id: 5, ...input } as any;
            mockRepo.create.mockResolvedValue(created);

            const result = await service.create(input);

            expect(result).toBe(created);
            expect(mockRepo.create).toHaveBeenCalledWith(input);
        });
    });

    // ── update ──────────────────────────────────────────────────────────────────

    describe("update", () => {
        it("returns updated session", async () => {
            const updated = { id: 1, name: "Updated GP" } as any;
            mockRepo.update.mockResolvedValue(updated);

            await expect(service.update(1, { name: "Updated GP" } as any)).resolves.toBe(updated);
        });

        it("throws 404 when session not found", async () => {
            mockRepo.update.mockResolvedValue(null);

            await expect(service.update(99, {} as any)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── delete ──────────────────────────────────────────────────────────────────

    describe("delete", () => {
        it("resolves when session deleted", async () => {
            mockRepo.delete.mockResolvedValue(true);

            await expect(service.delete(1)).resolves.toBeUndefined();
        });

        it("throws 404 when session not found", async () => {
            mockRepo.delete.mockResolvedValue(false);

            await expect(service.delete(99)).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
