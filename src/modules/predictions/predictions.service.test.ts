jest.mock("../../database/sequelize", () => ({
    sequelize: {
        transaction: jest.fn((cb: (tx: object) => unknown) => cb({})),
    },
}));

const mockRepo = {
    findAllBySession:                  jest.fn(),
    findById:                          jest.fn(),
    create:                            jest.fn(),
    update:                            jest.fn(),
    delete:                            jest.fn(),
    findPronosticByUserAndPrediction:  jest.fn(),
    findAllPronosticsForPrediction:    jest.fn(),
    findMyPronostics:                  jest.fn(),
    findMyPronosticsForSession:        jest.fn(),
    findProfileByUserId:               jest.fn(),
    createPronosticWithDetail:         jest.fn(),
};

jest.mock("./predictions.repository", () => ({
    PredictionsRepository: jest.fn().mockImplementation(() => mockRepo),
}));

jest.mock("./predictions.autoresolve", () => ({
    autoResolve:     jest.fn(),
    isWinnerForType: jest.requireActual("./predictions.autoresolve").isWinnerForType,
}));

import { PredictionsService } from "./predictions.service";
import { autoResolve } from "./predictions.autoresolve";
const mockAutoResolve = autoResolve as jest.Mock;

describe("PredictionsService", () => {
    let service: PredictionsService;

    beforeEach(() => {
        service = new PredictionsService();
    });

    // ── CRUD ────────────────────────────────────────────────────────────────────

    describe("getBySession", () => {
        it("returns all predictions for a session", async () => {
            const fakePreds = [{ id: 1 }, { id: 2 }] as any;
            mockRepo.findAllBySession.mockResolvedValue(fakePreds);

            await expect(service.getBySession(10)).resolves.toBe(fakePreds);
            expect(mockRepo.findAllBySession).toHaveBeenCalledWith(10);
        });
    });

    describe("getById", () => {
        it("returns prediction when found", async () => {
            const fakePred = { id: 1 } as any;
            mockRepo.findById.mockResolvedValue(fakePred);

            await expect(service.getById(1)).resolves.toBe(fakePred);
        });

        it("throws 404 when not found", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(service.getById(99)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe("create", () => {
        it("delegates to repository", async () => {
            const input = { type: "RACE_WINNER" } as any;
            const created = { id: 1, ...input } as any;
            mockRepo.create.mockResolvedValue(created);

            await expect(service.create(5, input)).resolves.toBe(created);
            expect(mockRepo.create).toHaveBeenCalledWith(5, input);
        });
    });

    describe("update", () => {
        it("returns updated prediction", async () => {
            const updated = { id: 1, type: "SPRINT_WINNER" } as any;
            mockRepo.update.mockResolvedValue(updated);

            await expect(service.update(1, { type: "SPRINT_WINNER" } as any)).resolves.toBe(updated);
        });

        it("throws 404 when not found", async () => {
            mockRepo.update.mockResolvedValue(null);

            await expect(service.update(99, {} as any)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe("delete", () => {
        it("resolves when deleted", async () => {
            mockRepo.delete.mockResolvedValue(true);

            await expect(service.delete(1)).resolves.toBeUndefined();
        });

        it("throws 404 when not found", async () => {
            mockRepo.delete.mockResolvedValue(false);

            await expect(service.delete(99)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    // ── placePronostic ──────────────────────────────────────────────────────────

    describe("placePronostic", () => {
        const fakePred = { id: 1, closesAt: null, defaultMultiplier: 2, type: "RACE_WINNER", session: null };
        const fakeProfile = { points: 100, update: jest.fn().mockResolvedValue({}) };
        const fakePronostic = { id: 1, predictionId: 1 } as any;

        beforeEach(() => {
            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findPronosticByUserAndPrediction
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(fakePronostic);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);
            mockRepo.createPronosticWithDetail.mockResolvedValue(fakePronostic);
        });

        it("debits points and creates pronostic", async () => {
            const result = await service.placePronostic(1, 1, { value: "VER", pointsStaked: 50 });

            expect(fakeProfile.update).toHaveBeenCalledWith({ points: 50 }, { transaction: {} });
            expect(mockRepo.createPronosticWithDetail).toHaveBeenCalledWith(1, 1, 50, "VER", 2, {});
            expect(result).toBe(fakePronostic);
        });

        it("throws 422 when prediction is closed", async () => {
            const closedPred = { ...fakePred, closesAt: new Date(Date.now() - 1000) };
            mockRepo.findById.mockResolvedValue(closedPred);

            await expect(
                service.placePronostic(1, 1, { value: "VER", pointsStaked: 10 }),
            ).rejects.toMatchObject({ statusCode: 422 });
        });

        it("throws 409 when pronostic already exists", async () => {
            mockRepo.findPronosticByUserAndPrediction.mockReset();
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(fakePronostic);

            await expect(
                service.placePronostic(1, 1, { value: "VER", pointsStaked: 10 }),
            ).rejects.toMatchObject({ statusCode: 409 });
        });

        it("throws 422 when not enough points", async () => {
            mockRepo.findPronosticByUserAndPrediction.mockReset();
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(null);
            mockRepo.findProfileByUserId.mockResolvedValue({ ...fakeProfile, points: 5 });

            await expect(
                service.placePronostic(1, 1, { value: "VER", pointsStaked: 50 }),
            ).rejects.toMatchObject({ statusCode: 422 });
        });

        it("throws 422 when profile not found", async () => {
            mockRepo.findPronosticByUserAndPrediction.mockReset();
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(null);
            mockRepo.findProfileByUserId.mockResolvedValue(null);

            await expect(
                service.placePronostic(1, 1, { value: "VER", pointsStaked: 50 }),
            ).rejects.toMatchObject({ statusCode: 422 });
        });

        it("throws 404 when prediction not found", async () => {
            mockRepo.findById.mockResolvedValue(null);
            await expect(service.placePronostic(1, 99, { value: "VER", pointsStaked: 50 }))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it("uses defaultMultiplier ?? 2 when defaultMultiplier is undefined", async () => {
            const predNoMultiplier = { id: 1, closesAt: null, type: "RACE_WINNER", session: null };
            mockRepo.findById.mockResolvedValue(predNoMultiplier);
            // Reset to clear any Once values queued by beforeEach, then set exactly 2
            mockRepo.findPronosticByUserAndPrediction.mockReset();
            mockRepo.findPronosticByUserAndPrediction
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(fakePronostic);
            mockRepo.findProfileByUserId.mockResolvedValue({ ...fakeProfile, points: 100 });
            mockRepo.createPronosticWithDetail.mockResolvedValue(fakePronostic);

            await service.placePronostic(1, 1, { value: "VER", pointsStaked: 50 });

            expect(mockRepo.createPronosticWithDetail).toHaveBeenCalledWith(1, 1, 50, "VER", 2, {});
        });
    });

    // ── updatePronostic ─────────────────────────────────────────────────────────

    describe("updatePronostic", () => {
        const fakePred = { id: 1, closesAt: null };
        const makePronostic = (stake: number, value = "VER") => ({
            pointsStaked: stake,
            detail: { value, update: jest.fn().mockResolvedValue({}) },
            update: jest.fn().mockResolvedValue({}),
        });

        it("met à jour la mise et la valeur", async () => {
            const existing = makePronostic(50);
            const fakeProfile = { points: 100, update: jest.fn().mockResolvedValue({}) } as any;
            const updated = { id: 1 };

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findPronosticByUserAndPrediction
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce(updated);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            const result = await service.updatePronostic(1, 1, { pointsStaked: 80, value: "LEC" });

            expect(fakeProfile.update).toHaveBeenCalledWith({ points: 70 }, { transaction: {} });
            expect(existing.update).toHaveBeenCalledWith({ pointsStaked: 80 }, { transaction: {} });
            expect(existing.detail.update).toHaveBeenCalledWith({ value: "LEC" }, { transaction: {} });
            expect(result).toBe(updated);
        });

        it("ne modifie pas les points si diff == 0", async () => {
            const existing = makePronostic(50);
            const fakeProfile = { points: 100, update: jest.fn().mockResolvedValue({}) } as any;
            const updated = { id: 1 };

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findPronosticByUserAndPrediction
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce(updated);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            await service.updatePronostic(1, 1, { pointsStaked: 50 });

            expect(fakeProfile.update).not.toHaveBeenCalled();
            expect(existing.update).not.toHaveBeenCalled();
        });

        it("throws 404 si prediction non trouvée", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(service.updatePronostic(1, 99, {})).rejects.toMatchObject({ statusCode: 404 });
        });

        it("throws 422 si prediction fermée", async () => {
            mockRepo.findById.mockResolvedValue({ id: 1, closesAt: new Date(Date.now() - 1000) });

            await expect(service.updatePronostic(1, 1, {})).rejects.toMatchObject({ statusCode: 422 });
        });

        it("throws 404 si pronostic non trouvé", async () => {
            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(null);
            mockRepo.findProfileByUserId.mockResolvedValue({ points: 100 });

            await expect(service.updatePronostic(1, 1, {})).rejects.toMatchObject({ statusCode: 404 });
        });

        it("throws 422 si pas assez de points pour augmenter la mise", async () => {
            const existing = makePronostic(50);
            const fakeProfile = { points: 10, update: jest.fn() } as any;

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValueOnce(existing);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            await expect(
                service.updatePronostic(1, 1, { pointsStaked: 200 }),
            ).rejects.toMatchObject({ statusCode: 422 });
        });

        it("ne met pas à jour le détail si existing.detail est null", async () => {
            const existing = {
                pointsStaked: 50,
                detail: null,
                update: jest.fn().mockResolvedValue({}),
            };
            const fakeProfile = { points: 100, update: jest.fn().mockResolvedValue({}) } as any;
            const updated = { id: 1 };

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findPronosticByUserAndPrediction
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce(updated);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            const result = await service.updatePronostic(1, 1, { value: "LEC" });

            expect(result).toBe(updated);
            expect(existing.update).not.toHaveBeenCalled();
        });

        it("throws 422 si profile non trouvé", async () => {
            const existing = makePronostic(50);
            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValueOnce(existing);
            mockRepo.findProfileByUserId.mockResolvedValue(null);

            await expect(service.updatePronostic(1, 1, {})).rejects.toMatchObject({ statusCode: 422 });
        });
    });

    // ── getMyPronostic / listMyPronostics / getMyPronosticsForSession / getAllPronosticsForPrediction

    describe("getMyPronostic", () => {
        it("delègue au repo", async () => {
            const fake = { id: 1 } as any;
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(fake);

            await expect(service.getMyPronostic(1, 1)).resolves.toBe(fake);
        });
    });

    describe("listMyPronostics", () => {
        it("retourne la liste paginée", async () => {
            mockRepo.findMyPronostics.mockResolvedValue({ rows: [{ id: 1 }], count: 1 });

            const result = await service.listMyPronostics(1, { limit: 20, offset: 0 });

            expect(result).toMatchObject({ items: [{ id: 1 }], total: 1, limit: 20, offset: 0 });
        });
    });

    describe("getMyPronosticsForSession", () => {
        it("delègue au repo", async () => {
            const fake = [{ id: 1 }] as any;
            mockRepo.findMyPronosticsForSession.mockResolvedValue(fake);

            await expect(service.getMyPronosticsForSession(1, 10)).resolves.toBe(fake);
        });
    });

    describe("getAllPronosticsForPrediction", () => {
        it("delègue au repo", async () => {
            const fake = [{ id: 1 }] as any;
            mockRepo.findAllPronosticsForPrediction.mockResolvedValue(fake);

            await expect(service.getAllPronosticsForPrediction(1)).resolves.toBe(fake);
        });
    });

    // ── cancelPronostic ─────────────────────────────────────────────────────────

    describe("cancelPronostic", () => {
        it("refunds points and destroys pronostic", async () => {
            const fakeDetail = { destroy: jest.fn().mockResolvedValue(undefined) };
            const fakePronostic = {
                pointsStaked: 30,
                detail: fakeDetail,
                destroy: jest.fn().mockResolvedValue(undefined),
            } as any;
            const fakeProfile = { points: 70, update: jest.fn().mockResolvedValue({}) } as any;

            mockRepo.findById.mockResolvedValue({ id: 1, closesAt: null });
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(fakePronostic);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            await service.cancelPronostic(1, 1);

            expect(fakeProfile.update).toHaveBeenCalledWith({ points: 100 }, { transaction: {} });
            expect(fakeDetail.destroy).toHaveBeenCalledWith({ transaction: {} });
            expect(fakePronostic.destroy).toHaveBeenCalledWith({ transaction: {} });
        });

        it("throws 422 when prediction is closed", async () => {
            mockRepo.findById.mockResolvedValue({ id: 1, closesAt: new Date(Date.now() - 1000) });

            await expect(service.cancelPronostic(1, 1)).rejects.toMatchObject({ statusCode: 422 });
        });

        it("throws 404 when pronostic not found", async () => {
            mockRepo.findById.mockResolvedValue({ id: 1, closesAt: null });
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(null);
            mockRepo.findProfileByUserId.mockResolvedValue({ points: 100 });

            await expect(service.cancelPronostic(1, 1)).rejects.toMatchObject({ statusCode: 404 });
        });

        it("annule sans erreur si le profil est null", async () => {
            const fakeDetail = { destroy: jest.fn().mockResolvedValue(undefined) };
            const fakePronostic = {
                pointsStaked: 30,
                detail: fakeDetail,
                destroy: jest.fn().mockResolvedValue(undefined),
            } as any;

            mockRepo.findById.mockResolvedValue({ id: 1, closesAt: null });
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(fakePronostic);
            mockRepo.findProfileByUserId.mockResolvedValue(null);

            await expect(service.cancelPronostic(1, 1)).resolves.toBeUndefined();
            expect(fakeDetail.destroy).toHaveBeenCalledWith({ transaction: {} });
            expect(fakePronostic.destroy).toHaveBeenCalledWith({ transaction: {} });
        });

        it("annule sans erreur si le détail est null", async () => {
            const fakePronostic = {
                pointsStaked: 30,
                detail: null,
                destroy: jest.fn().mockResolvedValue(undefined),
            } as any;
            const fakeProfile = { points: 70, update: jest.fn().mockResolvedValue({}) } as any;

            mockRepo.findById.mockResolvedValue({ id: 1, closesAt: null });
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(fakePronostic);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            await expect(service.cancelPronostic(1, 1)).resolves.toBeUndefined();
            expect(fakePronostic.destroy).toHaveBeenCalledWith({ transaction: {} });
        });

        it("throws 404 when prediction not found", async () => {
            mockRepo.findById.mockResolvedValue(null);
            await expect(service.cancelPronostic(1, 99)).rejects.toMatchObject({ statusCode: 404 });
        });

        it("annule avec profile.points null — crédite 0 + stake", async () => {
            const fakeDetail = { destroy: jest.fn().mockResolvedValue(undefined) };
            const fakePronostic = {
                pointsStaked: 30,
                detail: fakeDetail,
                destroy: jest.fn().mockResolvedValue(undefined),
            } as any;
            const fakeProfile = { points: null, update: jest.fn().mockResolvedValue({}) } as any;

            mockRepo.findById.mockResolvedValue({ id: 1, closesAt: null });
            mockRepo.findPronosticByUserAndPrediction.mockResolvedValue(fakePronostic);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            await service.cancelPronostic(1, 1);
            expect(fakeProfile.update).toHaveBeenCalledWith({ points: 30 }, { transaction: {} });
        });
    });

    // ── resolve ─────────────────────────────────────────────────────────────────

    describe("resolve", () => {
        const fakePred = { id: 1, type: "RACE_WINNER", session: { idCourseExternal: 9000 } } as any;

        it("throws 404 when prediction not found", async () => {
            mockRepo.findById.mockResolvedValue(null);
            await expect(service.resolve(1, { winningValue: "VER" })).rejects.toMatchObject({ statusCode: 404 });
        });

        const makePronostic = (value: string) => ({
            userId:      1,
            pointsStaked: 100,
            status:      "submitted",
            detail:      { value, multiplier: 2 },
            update:      jest.fn().mockResolvedValue({}),
        });

        it("resolves winners and credits points with manual winningValue", async () => {
            const winner = makePronostic("VER");
            const loser  = makePronostic("LEC");
            const fakeProfile = { points: 0, update: jest.fn().mockResolvedValue({}) } as any;

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findAllPronosticsForPrediction.mockResolvedValue([winner, loser] as any);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            const result = await service.resolve(1, { winningValue: "VER" });

            expect(winner.update).toHaveBeenCalledWith(
                { status: "won", pointsEarned: 200 }, { transaction: {} },
            );
            expect(loser.update).toHaveBeenCalledWith(
                { status: "lost", pointsEarned: 0 }, { transaction: {} },
            );
            expect(fakeProfile.update).toHaveBeenCalledWith({ points: 200 }, { transaction: {} });
            expect(result).toMatchObject({ resolved: 2, winningValue: "VER" });
        });

        it("sets awaiting_verification when auto-resolve returns null", async () => {
            const pronostic = makePronostic("VER");
            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findAllPronosticsForPrediction.mockResolvedValue([pronostic] as any);
            mockAutoResolve.mockResolvedValue(null);

            const result = await service.resolve(1, {});

            expect(pronostic.update).toHaveBeenCalledWith(
                { status: "awaiting_verification" }, { transaction: {} },
            );
            expect(result).toMatchObject({ resolved: 0, awaiting: 1, winningValue: null });
        });

        it("auto-resolves when no winningValue provided", async () => {
            const pronostic = makePronostic("VER");
            const fakeProfile = { points: 0, update: jest.fn().mockResolvedValue({}) } as any;

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findAllPronosticsForPrediction.mockResolvedValue([pronostic] as any);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);
            mockAutoResolve.mockResolvedValue("VER");

            const result = await service.resolve(1, {});

            expect(mockAutoResolve).toHaveBeenCalledWith("RACE_WINNER", 9000);
            expect(result).toMatchObject({ resolved: 1, winningValue: "VER" });
        });

        it("throws 422 when no winningValue and no OpenF1 session key", async () => {
            mockRepo.findById.mockResolvedValue({ id: 1, type: "RACE_WINNER", session: null });
            mockRepo.findAllPronosticsForPrediction.mockResolvedValue([]);

            await expect(service.resolve(1, {})).rejects.toMatchObject({ statusCode: 422 });
        });

        it("traite le cas où detail est null (userValue vide → loser)", async () => {
            const pronostic = {
                userId:       1,
                pointsStaked: 100,
                status:       "submitted",
                detail:       null,
                update:       jest.fn().mockResolvedValue({}),
            };

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findAllPronosticsForPrediction.mockResolvedValue([pronostic] as any);

            const result = await service.resolve(1, { winningValue: "VER" });

            expect(pronostic.update).toHaveBeenCalledWith(
                { status: "lost", pointsEarned: 0 }, { transaction: {} },
            );
            expect(result).toMatchObject({ resolved: 1, winningValue: "VER" });
        });

        it("résout des pronostics en awaiting_verification", async () => {
            const pronostic = {
                userId:       1,
                pointsStaked: 100,
                status:       "awaiting_verification",
                detail:       { value: "VER", multiplier: 2 },
                update:       jest.fn().mockResolvedValue({}),
            };
            const fakeProfile = { points: 0, update: jest.fn().mockResolvedValue({}) } as any;

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findAllPronosticsForPrediction.mockResolvedValue([pronostic] as any);
            mockRepo.findProfileByUserId.mockResolvedValue(fakeProfile);

            const result = await service.resolve(1, { winningValue: "VER" });

            expect(pronostic.update).toHaveBeenCalledWith(
                { status: "won", pointsEarned: 200 }, { transaction: {} },
            );
            expect(result.resolved).toBe(1);
        });

        it("ne crash pas si le profil du gagnant est null", async () => {
            const winner = makePronostic("VER");

            mockRepo.findById.mockResolvedValue(fakePred);
            mockRepo.findAllPronosticsForPrediction.mockResolvedValue([winner] as any);
            mockRepo.findProfileByUserId.mockResolvedValue(null);

            const result = await service.resolve(1, { winningValue: "VER" });

            expect(winner.update).toHaveBeenCalledWith(
                { status: "won", pointsEarned: 200 }, { transaction: {} },
            );
            expect(result).toMatchObject({ resolved: 1, winningValue: "VER" });
        });
    });
});
