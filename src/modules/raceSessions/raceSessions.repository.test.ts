const mockRaceSessionModel = {
    findByPk:        jest.fn(),
    findOne:         jest.fn(),
    findAndCountAll: jest.fn(),
    create:          jest.fn(),
};

jest.mock("../../database/models", () => ({
    RaceSessionModel: mockRaceSessionModel,
}));

import { RaceSessionsRepository } from "./raceSessions.repository";

describe("RaceSessionsRepository", () => {
    let repo: RaceSessionsRepository;

    beforeEach(() => {
        repo = new RaceSessionsRepository();
    });

    it("findById — délègue à findByPk", async () => {
        const fake = { id: 1 };
        mockRaceSessionModel.findByPk.mockResolvedValue(fake);

        const result = await repo.findById(1);

        expect(mockRaceSessionModel.findByPk).toHaveBeenCalledWith(1);
        expect(result).toBe(fake);
    });

    it("findByExternalId — cherche par idCourseExternal", async () => {
        const fake = { id: 1, idCourseExternal: 9000 };
        mockRaceSessionModel.findOne.mockResolvedValue(fake);

        const result = await repo.findByExternalId(9000);

        expect(mockRaceSessionModel.findOne).toHaveBeenCalledWith({
            where: { idCourseExternal: 9000 },
        });
        expect(result).toBe(fake);
    });

    it("list — retourne toutes les sessions sans filtre", async () => {
        const fakeResult = { rows: [{ id: 1 }], count: 1 };
        mockRaceSessionModel.findAndCountAll.mockResolvedValue(fakeResult);

        const result = await repo.list({ limit: 20, offset: 0 });

        expect(mockRaceSessionModel.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: {}, limit: 20, offset: 0 }),
        );
        expect(result).toBe(fakeResult);
    });

    it("list — filtre par q (iLike sur name)", async () => {
        mockRaceSessionModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

        await repo.list({ q: "monaco", limit: 10, offset: 0 });

        expect(mockRaceSessionModel.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ name: expect.anything() }),
            }),
        );
    });

    it("list — filtre par type", async () => {
        mockRaceSessionModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

        await repo.list({ type: "Race", limit: 10, offset: 0 });

        expect(mockRaceSessionModel.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ type: expect.anything() }),
            }),
        );
    });

    it("create — crée une session", async () => {
        const fakeSession = { id: 5 };
        mockRaceSessionModel.create.mockResolvedValue(fakeSession);

        const result = await repo.create({ name: "Monaco GP" } as any);

        expect(mockRaceSessionModel.create).toHaveBeenCalledWith({ name: "Monaco GP" });
        expect(result).toBe(fakeSession);
    });

    it("update — met à jour si trouvée", async () => {
        const fakeUpdate = jest.fn().mockResolvedValue({ id: 1, name: "Updated" });
        mockRaceSessionModel.findByPk.mockResolvedValue({ id: 1, update: fakeUpdate });

        const result = await repo.update(1, { name: "Updated" } as any);

        expect(fakeUpdate).toHaveBeenCalledWith({ name: "Updated" });
        expect(result).toEqual({ id: 1, name: "Updated" });
    });

    it("update — retourne null si non trouvée", async () => {
        mockRaceSessionModel.findByPk.mockResolvedValue(null);

        const result = await repo.update(99, {} as any);

        expect(result).toBeNull();
    });

    it("delete — supprime et retourne true", async () => {
        const fakeDestroy = jest.fn().mockResolvedValue(undefined);
        mockRaceSessionModel.findByPk.mockResolvedValue({ id: 1, destroy: fakeDestroy });

        const result = await repo.delete(1);

        expect(fakeDestroy).toHaveBeenCalled();
        expect(result).toBe(true);
    });

    it("delete — retourne false si non trouvée", async () => {
        mockRaceSessionModel.findByPk.mockResolvedValue(null);

        const result = await repo.delete(99);

        expect(result).toBe(false);
    });
});
