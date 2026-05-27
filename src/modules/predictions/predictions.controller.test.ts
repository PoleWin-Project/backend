const mockSvc = {
    getBySession:                  jest.fn(),
    getById:                       jest.fn(),
    create:                        jest.fn(),
    update:                        jest.fn(),
    delete:                        jest.fn(),
    placePronostic:                jest.fn(),
    updatePronostic:               jest.fn(),
    cancelPronostic:               jest.fn(),
    getMyPronostic:                jest.fn(),
    listMyPronostics:              jest.fn(),
    getMyPronosticsForSession:     jest.fn(),
    getAllPronosticsForPrediction:  jest.fn(),
    resolve:                       jest.fn(),
};

jest.mock("./predictions.service", () => ({
    PredictionsService: jest.fn().mockImplementation(() => mockSvc),
}));

import { PredictionsController } from "./predictions.controller";
import { AppError } from "../../common/errors/AppError";

function makeReq(overrides: object = {}) {
    return {
        params: {},
        body:   {},
        query:  {},
        user:   { id: 1, roles: ["user"] },
        ...overrides,
    } as any;
}

function makeRes() {
    const json   = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as any;
}

const next = jest.fn();

describe("PredictionsController", () => {
    let ctrl: PredictionsController;

    beforeEach(() => {
        ctrl = new PredictionsController();
        next.mockClear();
    });

    // ── getBySession ─────────────────────────────────────────────────────────

    it("getBySession — retourne les predictions", async () => {
        mockSvc.getBySession.mockResolvedValue([{ id: 1 }]);
        const req = makeReq({ params: { sessionId: "10" } });
        const res = makeRes();

        await ctrl.getBySession(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", predictions: [{ id: 1 }] });
    });

    it("getBySession — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.getBySession.mockRejectedValue(err);
        const req = makeReq({ params: { sessionId: "10" } });
        const res = makeRes();

        await ctrl.getBySession(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── getById ──────────────────────────────────────────────────────────────

    it("getById — retourne la prediction", async () => {
        mockSvc.getById.mockResolvedValue({ id: 1 });
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.getById(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", prediction: { id: 1 } });
    });

    it("getById — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.getById.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "99" } });
        const res = makeRes();

        await ctrl.getById(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── create ───────────────────────────────────────────────────────────────

    it("create — retourne 201 avec la prediction", async () => {
        mockSvc.create.mockResolvedValue({ id: 1, type: "RACE_WINNER" });
        const req = makeReq({ params: { sessionId: "10" }, body: { type: "RACE_WINNER" } });
        const res = makeRes();

        await ctrl.create(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.status().json).toHaveBeenCalledWith(
            expect.objectContaining({ prediction: { id: 1, type: "RACE_WINNER" } }),
        );
    });

    it("create — passe l'erreur à next()", async () => {
        const err = new AppError(422, "invalid");
        mockSvc.create.mockRejectedValue(err);
        const req = makeReq({ params: { sessionId: "10" }, body: {} });
        const res = makeRes();

        await ctrl.create(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── update ───────────────────────────────────────────────────────────────

    it("update — retourne la prediction mise à jour", async () => {
        mockSvc.update.mockResolvedValue({ id: 1 });
        const req = makeReq({ params: { predictionId: "1" }, body: {} });
        const res = makeRes();

        await ctrl.update(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", prediction: { id: 1 } });
    });

    it("update — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.update.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "99" }, body: {} });
        const res = makeRes();

        await ctrl.update(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── delete ───────────────────────────────────────────────────────────────

    it("delete — retourne ok", async () => {
        mockSvc.delete.mockResolvedValue(undefined);
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.delete(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok" });
    });

    it("delete — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.delete.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "99" } });
        const res = makeRes();

        await ctrl.delete(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── placePronostic ───────────────────────────────────────────────────────

    it("placePronostic — retourne 201", async () => {
        mockSvc.placePronostic.mockResolvedValue({ id: 1 });
        const req = makeReq({ params: { predictionId: "1" }, body: { value: "VER", pointsStaked: 50 } });
        const res = makeRes();

        await ctrl.placePronostic(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("placePronostic — passe l'erreur à next()", async () => {
        const err = new AppError(409, "Already exists");
        mockSvc.placePronostic.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "1" }, body: {} });
        const res = makeRes();

        await ctrl.placePronostic(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── updatePronostic ──────────────────────────────────────────────────────

    it("updatePronostic — retourne le pronostic mis à jour", async () => {
        mockSvc.updatePronostic.mockResolvedValue({ id: 1, pointsStaked: 80 });
        const req = makeReq({ params: { predictionId: "1" }, body: { pointsStaked: 80 } });
        const res = makeRes();

        await ctrl.updatePronostic(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ pronostic: { id: 1, pointsStaked: 80 } }),
        );
    });

    it("updatePronostic — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.updatePronostic.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "1" }, body: {} });
        const res = makeRes();

        await ctrl.updatePronostic(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── cancelPronostic ──────────────────────────────────────────────────────

    it("cancelPronostic — retourne ok", async () => {
        mockSvc.cancelPronostic.mockResolvedValue(undefined);
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.cancelPronostic(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok" });
    });

    it("cancelPronostic — passe l'erreur à next()", async () => {
        const err = new AppError(422, "Closed");
        mockSvc.cancelPronostic.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.cancelPronostic(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── myPronostic ──────────────────────────────────────────────────────────

    it("myPronostic — retourne le pronostic si trouvé", async () => {
        mockSvc.getMyPronostic.mockResolvedValue({ id: 1 });
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.myPronostic(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", pronostic: { id: 1 } });
    });

    it("myPronostic — retourne 404 si null", async () => {
        mockSvc.getMyPronostic.mockResolvedValue(null);
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.myPronostic(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("myPronostic — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.getMyPronostic.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.myPronostic(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── myPronostics ─────────────────────────────────────────────────────────

    it("myPronostics — retourne la liste paginée", async () => {
        mockSvc.listMyPronostics.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.myPronostics(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: "ok", total: 0 }),
        );
    });

    it("myPronostics — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.listMyPronostics.mockRejectedValue(err);
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.myPronostics(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── myPronosticsForSession ───────────────────────────────────────────────

    it("myPronosticsForSession — retourne les pronostics", async () => {
        mockSvc.getMyPronosticsForSession.mockResolvedValue([{ id: 1 }]);
        const req = makeReq({ params: { sessionId: "10" } });
        const res = makeRes();

        await ctrl.myPronosticsForSession(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", pronostics: [{ id: 1 }] });
    });

    it("myPronosticsForSession — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.getMyPronosticsForSession.mockRejectedValue(err);
        const req = makeReq({ params: { sessionId: "10" } });
        const res = makeRes();

        await ctrl.myPronosticsForSession(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── allPronostics ────────────────────────────────────────────────────────

    it("allPronostics — retourne tous les pronostics", async () => {
        mockSvc.getAllPronosticsForPrediction.mockResolvedValue([{ id: 1 }]);
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.allPronostics(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", pronostics: [{ id: 1 }] });
    });

    it("allPronostics — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.getAllPronosticsForPrediction.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "1" } });
        const res = makeRes();

        await ctrl.allPronostics(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── resolve ──────────────────────────────────────────────────────────────

    it("resolve — retourne le résultat", async () => {
        mockSvc.resolve.mockResolvedValue({ resolved: 3, awaiting: 0, winningValue: "VER" });
        const req = makeReq({ params: { predictionId: "1" }, body: { winningValue: "VER" } });
        const res = makeRes();

        await ctrl.resolve(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ resolved: 3, winningValue: "VER" }),
        );
    });

    it("resolve — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.resolve.mockRejectedValue(err);
        const req = makeReq({ params: { predictionId: "99" }, body: {} });
        const res = makeRes();

        await ctrl.resolve(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── sync ─────────────────────────────────────────────────────────────────

    it("sync — retourne le résultat de syncSeason", async () => {
        const mockSyncSeason = jest.fn().mockResolvedValue({ created: 2, updated: 1 });
        jest.doMock("./sync.service", () => ({
            SyncService: jest.fn().mockImplementation(() => ({ syncSeason: mockSyncSeason })),
        }));

        const req = makeReq({ body: { year: 2025 } });
        const res = makeRes();

        await ctrl.sync(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: "ok" }),
        );
    });

    it("sync — utilise l'année courante si non fournie", async () => {
        const req = makeReq({ body: {} });
        const res = makeRes();

        await ctrl.sync(req, res, next);

        expect(res.json).toHaveBeenCalled();
    });

    it("sync — passe l'erreur à next() si syncSeason échoue", async () => {
        const err = new Error("sync failed");
        jest.resetModules();
        jest.doMock("./sync.service", () => {
            throw err;
        });

        const req = makeReq({ body: { year: 2025 } });
        const res = makeRes();

        await ctrl.sync(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });
});
