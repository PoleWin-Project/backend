const mockSvc = {
    list:            jest.fn(),
    getById:         jest.fn(),
    create:          jest.fn(),
    update:          jest.fn(),
    delete:          jest.fn(),
    syncFromOpenF1:  jest.fn(),
};

jest.mock("./sessions.service", () => ({
    SessionsService: jest.fn().mockImplementation(() => mockSvc),
}));

import { SessionsController } from "./sessions.controller";
import { AppError } from "../../common/errors/AppError";

function makeReq(overrides: object = {}) {
    return { params: {}, body: {}, query: {}, ...overrides } as any;
}

function makeRes() {
    const json   = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as any;
}

const next = jest.fn();

describe("SessionsController", () => {
    let ctrl: SessionsController;

    beforeEach(() => {
        ctrl = new SessionsController();
        next.mockClear();
    });

    it("list — retourne les sessions", async () => {
        mockSvc.list.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.list(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: "ok", total: 0 }),
        );
    });

    it("list — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.list.mockRejectedValue(err);
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.list(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    it("getById — retourne la session", async () => {
        mockSvc.getById.mockResolvedValue({ id: 1 });
        const req = makeReq({ params: { sessionId: "1" } });
        const res = makeRes();

        await ctrl.getById(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", session: { id: 1 } });
    });

    it("getById — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.getById.mockRejectedValue(err);
        const req = makeReq({ params: { sessionId: "99" } });
        const res = makeRes();

        await ctrl.getById(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    it("create — retourne 201 avec la session", async () => {
        mockSvc.create.mockResolvedValue({ id: 5 });
        const req = makeReq({ body: { name: "Monaco GP" } });
        const res = makeRes();

        await ctrl.create(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.status().json).toHaveBeenCalledWith(
            expect.objectContaining({ session: { id: 5 } }),
        );
    });

    it("create — passe l'erreur à next()", async () => {
        const err = new AppError(422, "invalid");
        mockSvc.create.mockRejectedValue(err);
        const req = makeReq({ body: {} });
        const res = makeRes();

        await ctrl.create(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    it("update — retourne la session mise à jour", async () => {
        mockSvc.update.mockResolvedValue({ id: 1, name: "Updated GP" });
        const req = makeReq({ params: { sessionId: "1" }, body: { name: "Updated GP" } });
        const res = makeRes();

        await ctrl.update(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ session: { id: 1, name: "Updated GP" } }),
        );
    });

    it("update — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.update.mockRejectedValue(err);
        const req = makeReq({ params: { sessionId: "99" }, body: {} });
        const res = makeRes();

        await ctrl.update(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    it("delete — retourne ok", async () => {
        mockSvc.delete.mockResolvedValue(undefined);
        const req = makeReq({ params: { sessionId: "1" } });
        const res = makeRes();

        await ctrl.delete(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok" });
    });

    it("delete — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.delete.mockRejectedValue(err);
        const req = makeReq({ params: { sessionId: "99" } });
        const res = makeRes();

        await ctrl.delete(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    it("syncFromOpenF1 — retourne le résultat avec year fourni", async () => {
        mockSvc.syncFromOpenF1.mockResolvedValue({ created: 2, updated: 1, total: 3 });
        const req = makeReq({ query: { year: "2025" } });
        const res = makeRes();

        await ctrl.syncFromOpenF1(req, res, next);

        expect(mockSvc.syncFromOpenF1).toHaveBeenCalledWith(2025);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: "ok", created: 2 }),
        );
    });

    it("syncFromOpenF1 — utilise undefined si year absent", async () => {
        mockSvc.syncFromOpenF1.mockResolvedValue({ created: 0, updated: 0, total: 0 });
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.syncFromOpenF1(req, res, next);

        expect(mockSvc.syncFromOpenF1).toHaveBeenCalledWith(undefined);
    });

    it("syncFromOpenF1 — passe l'erreur à next()", async () => {
        const err = new AppError(500, "sync failed");
        mockSvc.syncFromOpenF1.mockRejectedValue(err);
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.syncFromOpenF1(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });
});
