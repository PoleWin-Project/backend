const mockRepo = {
    findAll:           jest.fn(),
    findById:          jest.fn(),
    create:            jest.fn(),
    update:            jest.fn(),
    delete:            jest.fn(),
    upsertFromOpenF1:  jest.fn(),
};

jest.mock("./sessions.repository", () => ({
    SessionsRepository: jest.fn().mockImplementation(() => mockRepo),
}));

const mockOpenF1Svc = {
    getSessions: jest.fn(),
};

jest.mock("../openf1/openf1.service", () => ({
    OpenF1Service: jest.fn().mockImplementation(() => mockOpenF1Svc),
}));

import { SessionsService } from "./sessions.service";

describe("SessionsService", () => {
    let service: SessionsService;

    beforeEach(() => {
        service = new SessionsService();
    });

    describe("list", () => {
        it("returns paginated items", async () => {
            const fakeSession = { id: 1, name: "Australian GP" } as any;
            mockRepo.findAll.mockResolvedValue({ rows: [fakeSession], count: 1 });

            const result = await service.list({ limit: 20, offset: 0 });

            expect(result).toEqual({ items: [fakeSession], total: 1, limit: 20, offset: 0 });
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

    // ── syncFromOpenF1 ───────────────────────────────────────────────────────────

    describe("syncFromOpenF1", () => {
        it("synchronise les sessions depuis OpenF1 et retourne les stats", async () => {
            const fakeSessions = [{ id: 1 }, { id: 2 }] as any;
            mockOpenF1Svc.getSessions.mockResolvedValue(fakeSessions);
            mockRepo.upsertFromOpenF1.mockResolvedValue({ created: 1, updated: 1 });

            const result = await service.syncFromOpenF1(2025);

            expect(mockOpenF1Svc.getSessions).toHaveBeenCalledWith({ year: 2025 });
            expect(result).toEqual({ created: 1, updated: 1, total: 2 });
        });

        it("utilise l'année courante si non fournie", async () => {
            mockOpenF1Svc.getSessions.mockResolvedValue([]);
            mockRepo.upsertFromOpenF1.mockResolvedValue({ created: 0, updated: 0 });

            await service.syncFromOpenF1();

            expect(mockOpenF1Svc.getSessions).toHaveBeenCalledWith({
                year: new Date().getFullYear(),
            });
        });
    });
});
