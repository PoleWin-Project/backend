jest.mock("./health.service", () => ({
    getHealth: jest.fn(),
    dbCheck:   jest.fn(),
}));

jest.mock("../../config/version", () => ({
    appVersion: "v1",
    appName:    "backend",
}));

jest.mock("../../config/env", () => ({
    env: { nodeEnv: "test" },
}));

import * as healthService from "./health.service";
import { health, dbCheck, version } from "./health.controller";

const mockGetHealth = healthService.getHealth as jest.Mock;
const mockDbCheck   = healthService.dbCheck   as jest.Mock;

function makeRes() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as any;
}

const req  = {} as any;
const next = jest.fn() as any;

describe("health controller", () => {
    describe("health()", () => {
        it("retourne le résultat de getHealth()", () => {
            const fakeHealth = { status: "ok", version: "v1" };
            mockGetHealth.mockReturnValue(fakeHealth);
            const res = makeRes();

            health(req, res);

            expect(res.json).toHaveBeenCalledWith(fakeHealth);
        });
    });

    describe("dbCheck()", () => {
        it("retourne ok quand la DB répond", async () => {
            mockDbCheck.mockResolvedValue({ ok: true, now: new Date("2025-01-01") });
            const res = makeRes();

            await dbCheck(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ status: "ok" }),
            );
        });

        it("retourne 500 quand la DB ne répond pas", async () => {
            mockDbCheck.mockResolvedValue({ ok: false, error: "connection refused" });
            const res = makeRes();

            await dbCheck(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.status().json).toHaveBeenCalledWith(
                expect.objectContaining({ status: "error" }),
            );
        });
    });

    describe("version()", () => {
        it("retourne les infos de version", () => {
            const res = makeRes();

            version(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ version: "v1", api: "v1" }),
            );
        });
    });
});
