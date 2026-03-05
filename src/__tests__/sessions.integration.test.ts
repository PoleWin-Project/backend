jest.mock("../modules/sessions/sessions.service", () => ({
    SessionsService: jest.fn().mockImplementation(function (this: any) {
        this.list    = jest.fn();
        this.getById = jest.fn();
        this.create  = jest.fn();
        this.update  = jest.fn();
        this.delete  = jest.fn();
    }),
}));

import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { SessionsService } from "../modules/sessions/sessions.service";
import sessionsRoutes from "../modules/sessions/sessions.routes";
import { errorHandler } from "../common/middleware/errorHandler";
import { notFound } from "../common/middleware/notFound";
import { AppError } from "../common/errors/AppError";

const MockedClass = SessionsService as jest.MockedClass<typeof SessionsService>;
let svc: any;

beforeAll(() => {
    svc = MockedClass.mock.instances[0];
});

// ── App builders ─────────────────────────────────────────────────────────────

function buildApp(user?: { id: number; roles: string[] }) {
    const app = express();
    app.use(express.json());
    if (user) {
        app.use((req: Request, _res: Response, next: NextFunction) => {
            (req as any).user = user;
            next();
        });
    }
    app.use("/api/v1", sessionsRoutes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

const appPublic = buildApp();
const appAdmin  = buildApp({ id: 1, roles: ["admin"] });

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeSession = {
    id:         1,
    name:       "Australian GP",
    type:       "Race",
    dateStart:  "2026-03-16T04:00:00.000Z",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/sessions", () => {
    it("returns paginated sessions", async () => {
        svc.list.mockResolvedValue({ items: [fakeSession], total: 1, limit: 20, offset: 0 });

        const res = await request(appPublic).get("/api/v1/sessions");

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.items).toHaveLength(1);
        expect(res.body.total).toBe(1);
    });

    it("passes type filter to service", async () => {
        svc.list.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

        await request(appPublic).get("/api/v1/sessions?type=Race");

        expect(svc.list).toHaveBeenCalledWith(
            expect.objectContaining({ type: "Race" }),
        );
    });

    it("returns 422 for invalid query params", async () => {
        const res = await request(appPublic).get("/api/v1/sessions?limit=abc");
        expect(res.status).toBe(422);
    });
});

describe("GET /api/v1/sessions/:sessionId", () => {
    it("returns session when found", async () => {
        svc.getById.mockResolvedValue(fakeSession);

        const res = await request(appPublic).get("/api/v1/sessions/1");

        expect(res.status).toBe(200);
        expect(res.body.session).toMatchObject({ id: 1, name: "Australian GP" });
    });

    it("returns 404 when not found", async () => {
        svc.getById.mockRejectedValue(new AppError(404, "Session not found"));

        const res = await request(appPublic).get("/api/v1/sessions/99");

        expect(res.status).toBe(404);
    });
});

describe("POST /api/v1/admin/sessions", () => {
    const validBody = { name: "Monaco GP", type: "Race" };

    it("creates session as admin", async () => {
        svc.create.mockResolvedValue({ id: 2, ...validBody });

        const res = await request(appAdmin)
            .post("/api/v1/admin/sessions")
            .send(validBody);

        expect(res.status).toBe(201);
        expect(res.body.session).toMatchObject({ id: 2, name: "Monaco GP" });
    });

    it("returns 401 without auth", async () => {
        const res = await request(appPublic)
            .post("/api/v1/admin/sessions")
            .send(validBody);

        expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin user", async () => {
        const appUser = buildApp({ id: 1, roles: ["user"] });
        const res = await request(appUser)
            .post("/api/v1/admin/sessions")
            .send(validBody);

        expect(res.status).toBe(403);
    });

    it("returns 422 for missing required fields", async () => {
        const res = await request(appAdmin)
            .post("/api/v1/admin/sessions")
            .send({ name: "GP" }); // missing type

        expect(res.status).toBe(422);
    });
});

describe("PATCH /api/v1/admin/sessions/:sessionId", () => {
    it("updates session as admin", async () => {
        svc.update.mockResolvedValue({ ...fakeSession, name: "Updated GP" });

        const res = await request(appAdmin)
            .patch("/api/v1/admin/sessions/1")
            .send({ name: "Updated GP" });

        expect(res.status).toBe(200);
        expect(res.body.session.name).toBe("Updated GP");
    });

    it("returns 404 when session not found", async () => {
        svc.update.mockRejectedValue(new AppError(404, "Session not found"));

        const res = await request(appAdmin)
            .patch("/api/v1/admin/sessions/99")
            .send({ name: "X" });

        expect(res.status).toBe(404);
    });
});

describe("DELETE /api/v1/admin/sessions/:sessionId", () => {
    it("deletes session as admin", async () => {
        svc.delete.mockResolvedValue(undefined);

        const res = await request(appAdmin).delete("/api/v1/admin/sessions/1");

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });

    it("returns 404 when session not found", async () => {
        svc.delete.mockRejectedValue(new AppError(404, "Session not found"));

        const res = await request(appAdmin).delete("/api/v1/admin/sessions/99");

        expect(res.status).toBe(404);
    });
});
