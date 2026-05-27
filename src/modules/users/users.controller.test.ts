const mockSvc = {
    getMe:               jest.fn(),
    getMyStats:          jest.fn(),
    updateMe:            jest.fn(),
    deleteMe:            jest.fn(),
    searchUsers:         jest.fn(),
    getPublicProfile:    jest.fn(),
    getPublicFriendsCount: jest.fn(),
    listUsers:           jest.fn(),
    adminUpdateUser:     jest.fn(),
};

jest.mock("./users.service", () => ({
    UsersService: jest.fn().mockImplementation(() => mockSvc),
}));

jest.mock("../../common/utils/hateoas", () => ({
    withLinks:           (obj: any) => obj,
    meLinks:             jest.fn().mockReturnValue([]),
    publicProfileLinks:  jest.fn().mockReturnValue([]),
}));

import { UsersController } from "./users.controller";
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

describe("UsersController", () => {
    let ctrl: UsersController;

    beforeEach(() => {
        ctrl = new UsersController();
        next.mockClear();
    });

    // ── me ────────────────────────────────────────────────────────────────────

    it("me — retourne l'utilisateur courant", async () => {
        mockSvc.getMe.mockResolvedValue({ id: 1, username: "test" });
        const req = makeReq();
        const res = makeRes();

        await ctrl.me(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ user: { id: 1, username: "test" } }),
        );
    });

    it("me — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.getMe.mockRejectedValue(err);
        const req = makeReq();
        const res = makeRes();

        await ctrl.me(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── myStats ───────────────────────────────────────────────────────────────

    it("myStats — retourne les stats", async () => {
        const fakeStats = { total: 5, won: 3, lost: 2 };
        mockSvc.getMyStats.mockResolvedValue(fakeStats);
        const req = makeReq();
        const res = makeRes();

        await ctrl.myStats(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", stats: fakeStats });
    });

    it("myStats — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.getMyStats.mockRejectedValue(err);
        const req = makeReq();
        const res = makeRes();

        await ctrl.myStats(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── updateMe ─────────────────────────────────────────────────────────────

    it("updateMe — retourne l'utilisateur mis à jour", async () => {
        mockSvc.updateMe.mockResolvedValue({ id: 1, username: "newname" });
        const req = makeReq({ body: { username: "newname" } });
        const res = makeRes();

        await ctrl.updateMe(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ user: { id: 1, username: "newname" } }),
        );
    });

    it("updateMe — passe l'erreur à next()", async () => {
        const err = new AppError(409, "Username taken");
        mockSvc.updateMe.mockRejectedValue(err);
        const req = makeReq({ body: {} });
        const res = makeRes();

        await ctrl.updateMe(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── publicProfile ─────────────────────────────────────────────────────────

    it("publicProfile — retourne le profil public", async () => {
        mockSvc.getPublicProfile.mockResolvedValue({ id: "2", username: "other" });
        const req = makeReq({ params: { id: "2" } });
        const res = makeRes();

        await ctrl.publicProfile(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ user: { id: "2", username: "other" } }),
        );
    });

    it("publicProfile — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.getPublicProfile.mockRejectedValue(err);
        const req = makeReq({ params: { id: "99" } });
        const res = makeRes();

        await ctrl.publicProfile(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── search ────────────────────────────────────────────────────────────────

    it("search — retourne les utilisateurs trouvés", async () => {
        mockSvc.searchUsers.mockResolvedValue([{ id: 1 }]);
        const req = makeReq({ query: { q: "test" } });
        const res = makeRes();

        await ctrl.search(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", users: [{ id: 1 }] });
    });

    it("search — utilise chaîne vide si q absent", async () => {
        mockSvc.searchUsers.mockResolvedValue([]);
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.search(req, res, next);

        expect(mockSvc.searchUsers).toHaveBeenCalledWith("");
    });

    it("search — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.searchUsers.mockRejectedValue(err);
        const req = makeReq({ query: { q: "x" } });
        const res = makeRes();

        await ctrl.search(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── list ─────────────────────────────────────────────────────────────────

    it("list — retourne la liste paginée", async () => {
        mockSvc.listUsers.mockResolvedValue({ items: [], total: 0 });
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.list(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: "ok", total: 0 }),
        );
    });

    it("list — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.listUsers.mockRejectedValue(err);
        const req = makeReq({ query: {} });
        const res = makeRes();

        await ctrl.list(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── adminUpdate ───────────────────────────────────────────────────────────

    it("adminUpdate — retourne l'utilisateur mis à jour", async () => {
        mockSvc.adminUpdateUser.mockResolvedValue({ id: 2, role: "admin" });
        const req = makeReq({ params: { id: "2" }, body: { role: "admin" } });
        const res = makeRes();

        await ctrl.adminUpdate(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", user: { id: 2, role: "admin" } });
    });

    it("adminUpdate — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.adminUpdateUser.mockRejectedValue(err);
        const req = makeReq({ params: { id: "99" }, body: {} });
        const res = makeRes();

        await ctrl.adminUpdate(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── publicFriendsCount ────────────────────────────────────────────────────

    it("publicFriendsCount — retourne le nombre d'amis", async () => {
        mockSvc.getPublicFriendsCount.mockResolvedValue(5);
        const req = makeReq({ params: { id: "2" } });
        const res = makeRes();

        await ctrl.publicFriendsCount(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", count: 5 });
    });

    it("publicFriendsCount — passe l'erreur à next()", async () => {
        const err = new AppError(500, "fail");
        mockSvc.getPublicFriendsCount.mockRejectedValue(err);
        const req = makeReq({ params: { id: "2" } });
        const res = makeRes();

        await ctrl.publicFriendsCount(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });

    // ── deleteMe ──────────────────────────────────────────────────────────────

    it("deleteMe — retourne ok", async () => {
        mockSvc.deleteMe.mockResolvedValue(true);
        const req = makeReq();
        const res = makeRes();

        await ctrl.deleteMe(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ status: "ok", message: "User deleted" });
    });

    it("deleteMe — passe l'erreur à next()", async () => {
        const err = new AppError(404, "Not found");
        mockSvc.deleteMe.mockRejectedValue(err);
        const req = makeReq();
        const res = makeRes();

        await ctrl.deleteMe(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });
});
