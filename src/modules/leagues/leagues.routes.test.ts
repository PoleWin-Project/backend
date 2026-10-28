jest.mock("./leagues.service", () => ({
    LeaguesService: jest.fn().mockImplementation(() => ({
        create: jest.fn().mockResolvedValue({ id: 7, inviteCode: "abcdef0123456789" }),
        listMine: jest.fn().mockResolvedValue([]),
        join: jest.fn().mockResolvedValue({ id: 7 }),
        members: jest.fn().mockResolvedValue([]),
        leave: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
    })),
}));

import express from "express";
import request from "supertest";
import leaguesRoutes from "./leagues.routes";
import { errorHandler } from "../../common/middleware/errorHandler";

function app(authenticated: boolean) {
    const server = express();
    server.use(express.json());
    if (authenticated) server.use((req, _res, next) => { req.user = { id: 1, roles: ["user"] } as any; next(); });
    server.use("/api/v1", leaguesRoutes);
    server.use(errorHandler);
    return server;
}

it("keeps private league routes behind authentication", async () => {
    const response = await request(app(false)).post("/api/v1/leagues").send({ name: "Friends" });
    expect(response.status).toBe(401);
});

it("creates a league and returns its invitation code", async () => {
    const response = await request(app(true)).post("/api/v1/leagues").send({ name: "Friends" });
    expect(response.status).toBe(201);
    expect(response.body.league.inviteCode).toBe("abcdef0123456789");
});

it("rejects an invalid league name", async () => {
    const response = await request(app(true)).post("/api/v1/leagues").send({ name: "x" });
    expect(response.status).toBe(422);
});
