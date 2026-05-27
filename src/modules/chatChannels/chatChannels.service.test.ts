const mockRepo = {
    findById:        jest.fn(),
    listBySession:   jest.fn(),
    findBySessionId: jest.fn(),
    create:          jest.fn(),
};

jest.mock("./chatChannels.repository", () => ({
    ChatChannelsRepository: jest.fn().mockImplementation(() => mockRepo),
}));

const mockRaceSessionModel = {
    findByPk: jest.fn(),
};

jest.mock("../../database/models", () => ({
    RaceSessionModel: mockRaceSessionModel,
}));

import { ChatChannelsService } from "./chatChannels.service";
import { httpErrors } from "../../common/errors/http";

describe("ChatChannelsService", () => {
    let service: ChatChannelsService;

    beforeEach(() => {
        service = new ChatChannelsService();
    });

    // ── getById ──────────────────────────────────────────────────────────────

    describe("getById", () => {
        it("retourne le channel si trouvé", async () => {
            const fakeChannel = { id: 1, name: "Live" };
            mockRepo.findById.mockResolvedValue(fakeChannel);

            const result = await service.getById(1);

            expect(result).toBe(fakeChannel);
        });

        it("throws 404 si non trouvé", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(service.getById(99)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── listBySession ────────────────────────────────────────────────────────

    describe("listBySession", () => {
        it("retourne la liste des channels de la session", async () => {
            mockRaceSessionModel.findByPk
                .mockResolvedValueOnce({ id: 10, name: "Monaco GP" }) // listBySession call
                .mockResolvedValueOnce({ id: 10 });                   // ensureLiveChannel call
            mockRepo.findBySessionId.mockResolvedValue({ id: 1, name: "Live - Monaco GP" });
            mockRepo.listBySession.mockResolvedValue({ rows: [{ id: 1 }], count: 1 });

            const result = await service.listBySession(10, { limit: 20, offset: 0 });

            expect(result.items).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it("throws 404 si la session n'existe pas", async () => {
            mockRaceSessionModel.findByPk.mockResolvedValue(null);

            await expect(
                service.listBySession(99, { limit: 20, offset: 0 }),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── ensureLiveChannelForSession ───────────────────────────────────────────

    describe("ensureLiveChannelForSession", () => {
        it("retourne le channel existant si déjà créé", async () => {
            const fakeChannel = { id: 1, name: "Live - Monaco GP" };
            mockRaceSessionModel.findByPk.mockResolvedValue({ id: 10 });
            mockRepo.findBySessionId.mockResolvedValue(fakeChannel);

            const result = await service.ensureLiveChannelForSession(10, "Monaco GP");

            expect(result).toBe(fakeChannel);
            expect(mockRepo.create).not.toHaveBeenCalled();
        });

        it("crée le channel s'il n'existe pas (avec nom de session)", async () => {
            const newChannel = { id: 2, name: "Live - Monaco GP" };
            mockRaceSessionModel.findByPk.mockResolvedValue({ id: 10 });
            mockRepo.findBySessionId.mockResolvedValue(null);
            mockRepo.create.mockResolvedValue(newChannel);

            const result = await service.ensureLiveChannelForSession(10, "Monaco GP");

            expect(mockRepo.create).toHaveBeenCalledWith(10, { name: "Live - Monaco GP" });
            expect(result).toBe(newChannel);
        });

        it("crée le channel sans nom de session (nom de fallback)", async () => {
            const newChannel = { id: 3, name: "Live - Session #10" };
            mockRaceSessionModel.findByPk.mockResolvedValue({ id: 10 });
            mockRepo.findBySessionId.mockResolvedValue(null);
            mockRepo.create.mockResolvedValue(newChannel);

            const result = await service.ensureLiveChannelForSession(10);

            expect(mockRepo.create).toHaveBeenCalledWith(10, { name: "Live - Session #10" });
            expect(result).toBe(newChannel);
        });

        it("throws 404 si la session n'existe pas", async () => {
            mockRaceSessionModel.findByPk.mockResolvedValue(null);

            await expect(
                service.ensureLiveChannelForSession(99),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
