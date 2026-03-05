jest.mock("../modules/predictions/predictions.service", () => ({
    PredictionsService: jest.fn().mockImplementation(function (this: any) {
        this.getBySession                 = jest.fn();
        this.getById                      = jest.fn();
        this.create                       = jest.fn();
        this.update                       = jest.fn();
        this.delete                       = jest.fn();
        this.placePronostic               = jest.fn();
        this.updatePronostic              = jest.fn();
        this.cancelPronostic              = jest.fn();
        this.getMyPronostic               = jest.fn();
        this.listMyPronostics             = jest.fn();
        this.getMyPronosticsForSession    = jest.fn();
        this.getAllPronosticsForPrediction = jest.fn();
        this.resolve                      = jest.fn();
    }),
}));

import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { PredictionsService } from "../modules/predictions/predictions.service";
import predictionsRoutes from "../modules/predictions/predictions.routes";
import { errorHandler } from "../common/middleware/errorHandler";
import { notFound } from "../common/middleware/notFound";
import { AppError } from "../common/errors/AppError";

const MockedClass = PredictionsService as jest.MockedClass<typeof PredictionsService>;
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
    app.use("/api/v1", predictionsRoutes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

const appPublic = buildApp();
const appUser   = buildApp({ id: 1, roles: ["user"] });
const appAdmin  = buildApp({ id: 1, roles: ["admin"] });

// ── Fixtures ─────────────────────────────────────────────────────────────────

const fakePrediction = {
    id:               1,
    sessionId:        10,
    type:             "RACE_WINNER",
    closesAt:         null,
    defaultMultiplier: 2,
};

const fakePronostic = {
    id:           1,
    userId:       1,
    predictionId: 1,
    pointsStaked: 50,
    status:       "submitted",
    detail:       { value: "VER", multiplier: 2 },
};

// ── Public routes ─────────────────────────────────────────────────────────────

describe("GET /api/v1/sessions/:sessionId/predictions", () => {
    it("returns predictions for a session", async () => {
        svc.getBySession.mockResolvedValue([fakePrediction]);

        const res = await request(appPublic).get("/api/v1/sessions/10/predictions");

        expect(res.status).toBe(200);
        expect(res.body.predictions).toHaveLength(1);
        expect(res.body.predictions[0].type).toBe("RACE_WINNER");
    });
});

describe("GET /api/v1/predictions/:predictionId", () => {
    it("returns prediction when found", async () => {
        svc.getById.mockResolvedValue(fakePrediction);

        const res = await request(appPublic).get("/api/v1/predictions/1");

        expect(res.status).toBe(200);
        expect(res.body.prediction.id).toBe(1);
    });

    it("returns 404 when not found", async () => {
        svc.getById.mockRejectedValue(new AppError(404, "Prediction not found"));

        const res = await request(appPublic).get("/api/v1/predictions/99");

        expect(res.status).toBe(404);
    });
});

// ── Auth user routes ──────────────────────────────────────────────────────────

describe("POST /api/v1/predictions/:predictionId/pronostic", () => {
    const validBody = { value: "VER", pointsStaked: 50 };

    it("places a pronostic", async () => {
        svc.placePronostic.mockResolvedValue(fakePronostic);

        const res = await request(appUser)
            .post("/api/v1/predictions/1/pronostic")
            .send(validBody);

        expect(res.status).toBe(201);
        expect(res.body.pronostic.status).toBe("submitted");
        expect(svc.placePronostic).toHaveBeenCalledWith(1, 1, validBody);
    });

    it("returns 401 without auth", async () => {
        const res = await request(appPublic)
            .post("/api/v1/predictions/1/pronostic")
            .send(validBody);

        expect(res.status).toBe(401);
    });

    it("returns 422 for invalid body", async () => {
        const res = await request(appUser)
            .post("/api/v1/predictions/1/pronostic")
            .send({ value: "VER" }); // missing pointsStaked

        expect(res.status).toBe(422);
    });

    it("returns 409 when pronostic already exists", async () => {
        svc.placePronostic.mockRejectedValue(new AppError(409, "Already exists"));

        const res = await request(appUser)
            .post("/api/v1/predictions/1/pronostic")
            .send(validBody);

        expect(res.status).toBe(409);
    });

    it("returns 422 when not enough points", async () => {
        svc.placePronostic.mockRejectedValue(new AppError(422, "Not enough points"));

        const res = await request(appUser)
            .post("/api/v1/predictions/1/pronostic")
            .send(validBody);

        expect(res.status).toBe(422);
    });
});

describe("PATCH /api/v1/predictions/:predictionId/pronostic", () => {
    it("updates the pronostic", async () => {
        const updated = { ...fakePronostic, pointsStaked: 80 };
        svc.updatePronostic.mockResolvedValue(updated);

        const res = await request(appUser)
            .patch("/api/v1/predictions/1/pronostic")
            .send({ pointsStaked: 80 });

        expect(res.status).toBe(200);
        expect(res.body.pronostic.pointsStaked).toBe(80);
    });
});

describe("DELETE /api/v1/predictions/:predictionId/pronostic", () => {
    it("cancels the pronostic", async () => {
        svc.cancelPronostic.mockResolvedValue(undefined);

        const res = await request(appUser).delete("/api/v1/predictions/1/pronostic");

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });
});

describe("GET /api/v1/users/me/pronostics", () => {
    it("returns paginated pronostics for current user", async () => {
        svc.listMyPronostics.mockResolvedValue({
            items: [fakePronostic], total: 1, limit: 20, offset: 0,
        });

        const res = await request(appUser).get("/api/v1/users/me/pronostics");

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
    });

    it("returns 401 without auth", async () => {
        const res = await request(appPublic).get("/api/v1/users/me/pronostics");
        expect(res.status).toBe(401);
    });
});

// ── Admin routes ──────────────────────────────────────────────────────────────

describe("POST /api/v1/admin/sessions/:sessionId/predictions", () => {
    const validBody = { type: "RACE_WINNER", defaultMultiplier: 2 };

    it("creates prediction as admin", async () => {
        svc.create.mockResolvedValue(fakePrediction);

        const res = await request(appAdmin)
            .post("/api/v1/admin/sessions/10/predictions")
            .send(validBody);

        expect(res.status).toBe(201);
        expect(res.body.prediction.type).toBe("RACE_WINNER");
    });

    it("returns 403 for non-admin user", async () => {
        const res = await request(appUser)
            .post("/api/v1/admin/sessions/10/predictions")
            .send(validBody);

        expect(res.status).toBe(403);
    });

    it("returns 422 for invalid type", async () => {
        const res = await request(appAdmin)
            .post("/api/v1/admin/sessions/10/predictions")
            .send({ type: "INVALID_TYPE" });

        expect(res.status).toBe(422);
    });
});

describe("POST /api/v1/admin/predictions/:predictionId/resolve", () => {
    it("resolves with manual winningValue", async () => {
        svc.resolve.mockResolvedValue({ resolved: 3, awaiting: 0, winningValue: "VER" });

        const res = await request(appAdmin)
            .post("/api/v1/admin/predictions/1/resolve")
            .send({ winningValue: "VER" });

        expect(res.status).toBe(200);
        expect(res.body.winningValue).toBe("VER");
        expect(res.body.resolved).toBe(3);
    });

    it("auto-resolves without winningValue body", async () => {
        svc.resolve.mockResolvedValue({ resolved: 2, awaiting: 0, winningValue: "HAM" });

        const res = await request(appAdmin)
            .post("/api/v1/admin/predictions/1/resolve")
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.winningValue).toBe("HAM");
    });

    it("returns awaiting when auto-resolve fails", async () => {
        svc.resolve.mockResolvedValue({ resolved: 0, awaiting: 5, winningValue: null });

        const res = await request(appAdmin)
            .post("/api/v1/admin/predictions/1/resolve")
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.awaiting).toBe(5);
    });
});
