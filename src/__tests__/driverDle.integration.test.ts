jest.mock("../modules/driverDle/driverDle.service", () => ({
    DriverDleService: jest.fn().mockImplementation(function (this: any) {
        this.getRoster = jest.fn();
        this.guess     = jest.fn();
    }),
}));

import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { DriverDleService } from "../modules/driverDle/driverDle.service";
import driverDleRoutes from "../modules/driverDle/driverDle.routes";
import { errorHandler } from "../common/middleware/errorHandler";
import { notFound } from "../common/middleware/notFound";
import { AppError } from "../common/errors/AppError";

const MockedClass = DriverDleService as jest.MockedClass<typeof DriverDleService>;
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
    app.use("/api/v1/driver-dle", driverDleRoutes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

const appPublic = buildApp();
const appUser   = buildApp({ id: 1, roles: ["user"] });

// ── Fixtures ─────────────────────────────────────────────────────────────────

const fakeRoster = [
    { driverId: "1", fullName: "Max VERSTAPPEN", teamName: "Red Bull Racing", driverNumber: 1, nationality: "Dutch", headshotUrl: null },
];

const fakeGuess = {
    found: false,
    gameOver: false,
    attemptsUsed: 1,
    maxAttempts: 6,
    feedback: {
        driverId: "44",
        fullName: "Lewis HAMILTON",
        headshotUrl: null,
        team:                 { value: "Ferrari",  status: "wrong" },
        nationality:          { value: "British",  status: "wrong" },
        debutYear:            { value: 2007, status: "lower" },
        wins:                 { value: 2,  status: "higher" },
        podiums:              { value: 3,  status: "higher" },
    },
};

// ── Roster ───────────────────────────────────────────────────────────────────

describe("GET /api/v1/driver-dle/roster", () => {
    it("returns the roster for an authenticated user", async () => {
        svc.getRoster.mockResolvedValue(fakeRoster);

        const res = await request(appUser).get("/api/v1/driver-dle/roster");

        expect(res.status).toBe(200);
        expect(res.body.roster).toHaveLength(1);
        expect(res.body.roster[0].driverId).toBe("1");
    });

    it("returns 401 without auth", async () => {
        const res = await request(appPublic).get("/api/v1/driver-dle/roster");
        expect(res.status).toBe(401);
    });
});

// ── Guess ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/driver-dle/guess", () => {
    it("returns per-attribute feedback for a valid guess", async () => {
        svc.guess.mockResolvedValue(fakeGuess);

        const res = await request(appUser)
            .post("/api/v1/driver-dle/guess")
            .send({ driverId: "44" });

        expect(res.status).toBe(200);
        expect(res.body.found).toBe(false);
        expect(res.body.attemptsUsed).toBe(1);
        expect(res.body.feedback.team.status).toBe("wrong");
        expect(svc.guess).toHaveBeenCalledWith(1, "44", false);
    });

    it("returns 400 when driverId is missing", async () => {
        const res = await request(appUser).post("/api/v1/driver-dle/guess").send({});
        expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
        const res = await request(appPublic)
            .post("/api/v1/driver-dle/guess")
            .send({ driverId: "1" });
        expect(res.status).toBe(401);
    });

    it("enforces the 1-game/day limit with a 403", async () => {
        svc.guess.mockRejectedValue(new AppError(403, "Tu as déjà joué aujourd'hui. Reviens demain !"));

        const res = await request(appUser)
            .post("/api/v1/driver-dle/guess")
            .send({ driverId: "1" });

        expect(res.status).toBe(403);
    });
});
