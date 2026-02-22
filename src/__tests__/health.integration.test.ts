import request from "supertest";
import express from "express";
import helmet from "helmet";
import healthRoutes from "../modules/health/health.routes";
import { errorHandler } from "../common/middleware/errorHandler";
import { notFound } from "../common/middleware/notFound";

function buildTestApp() {
    const app = express();
    app.use(helmet());
    app.use(express.json());
    app.use("/api/v1", healthRoutes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

describe("GET /api/v1/health", () => {
    const app = buildTestApp();

    it("retourne 200 avec les infos système", async () => {
        const res = await request(app).get("/api/v1/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.version).toBe("v1");
        expect(typeof res.body.uptimeSec).toBe("number");
        expect(res.body.memory).toBeDefined();
        expect(typeof res.body.timestamp).toBe("string");
    });

    it("retourne les headers de sécurité helmet", async () => {
        const res = await request(app).get("/api/v1/health");
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-frame-options"]).toBeDefined();
    });
});

describe("Route inconnue", () => {
    const app = buildTestApp();

    it("retourne 404 pour une route inexistante", async () => {
        const res = await request(app).get("/api/v1/does-not-exist");
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
    });
});
