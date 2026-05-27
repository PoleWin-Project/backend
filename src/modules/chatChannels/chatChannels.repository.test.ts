const mockChatChannelModel = {
    findByPk:         jest.fn(),
    findAndCountAll:  jest.fn(),
    findOne:          jest.fn(),
    create:           jest.fn(),
};

const mockRaceSessionModel = {};

jest.mock("../../database/models", () => ({
    ChatChannelModel:  mockChatChannelModel,
    RaceSessionModel:  mockRaceSessionModel,
}));

import { ChatChannelsRepository } from "./chatChannels.repository";

describe("ChatChannelsRepository", () => {
    let repo: ChatChannelsRepository;

    beforeEach(() => {
        repo = new ChatChannelsRepository();
    });

    it("findById — appelle findByPk avec include session", async () => {
        const fakeChannel = { id: 1 };
        mockChatChannelModel.findByPk.mockResolvedValue(fakeChannel);

        const result = await repo.findById(1);

        expect(mockChatChannelModel.findByPk).toHaveBeenCalledWith(
            1,
            expect.objectContaining({ include: expect.any(Array) }),
        );
        expect(result).toBe(fakeChannel);
    });

    it("listBySession — retourne les channels paginés", async () => {
        const fakeResult = { rows: [{ id: 1 }], count: 1 };
        mockChatChannelModel.findAndCountAll.mockResolvedValue(fakeResult);

        const result = await repo.listBySession(10, { limit: 20, offset: 0 });

        expect(mockChatChannelModel.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { sessionId: 10 }, limit: 20, offset: 0 }),
        );
        expect(result).toBe(fakeResult);
    });

    it("findBySessionId — appelle findOne avec sessionId", async () => {
        const fakeChannel = { id: 1 };
        mockChatChannelModel.findOne.mockResolvedValue(fakeChannel);

        const result = await repo.findBySessionId(10);

        expect(mockChatChannelModel.findOne).toHaveBeenCalledWith({
            where: { sessionId: 10 },
        });
        expect(result).toBe(fakeChannel);
    });

    it("create — crée un channel avec le nom donné", async () => {
        const fakeChannel = { id: 1, name: "Live - Monaco GP" };
        mockChatChannelModel.create.mockResolvedValue(fakeChannel);

        const result = await repo.create(10, { name: "Live - Monaco GP" });

        expect(mockChatChannelModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ sessionId: 10, name: "Live - Monaco GP" }),
        );
        expect(result).toBe(fakeChannel);
    });
});
