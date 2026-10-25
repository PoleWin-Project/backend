jest.mock("../../modules/push/push.service", () => ({
    notifyUser: jest.fn(), broadcastToAll: jest.fn(), PushService: jest.fn(),
}));
import request from "supertest";
import { createApp } from "../../app";
import { signAccessToken } from "../../common/utils/jwt";
import { env } from "../../config/env";
import { GamePlayModel, GarageTransactionModel, PredictionModel, PronosticModel, ProfileModel } from "../../database/models";
import { ChallengesService, weekWindow } from "../../modules/challenges/challenges.service";
import { garageService } from "../../modules/garage/garage.service";
import { setupDb, resetDb, closeDb, createUser, createActiveSeason, createOpenPrediction } from "./helpers";

const service = new ChallengesService();
beforeAll(setupDb);
beforeEach(async () => { await resetDb(); env.scoringModel = "championship"; });
afterAll(closeDb);

it("uses Monday UTC across Sunday and year boundaries", () => {
    expect(weekWindow(new Date("2027-01-03T23:59:59Z")).key).toBe("2026-12-28");
    expect(weekWindow(new Date("2027-01-04T00:00:00Z")).key).toBe("2027-01-04");
});

it("counts successful games only, unique UTC days, and excludes last week", async () => {
    const user = await createUser("weekly");
    const now = new Date("2026-10-25T20:00:00Z");
    await GamePlayModel.bulkCreate([
        { userId: user.id, gameId: "reaction", points: 10, metricMs: 200, playedAt: new Date("2026-10-19T12:00:00Z") },
        { userId: user.id, gameId: "reaction", points: 0, metricMs: null, playedAt: new Date("2026-10-20T12:00:00Z") },
        { userId: user.id, gameId: "reaction", points: 10, metricMs: 200, playedAt: new Date("2026-10-18T23:59:59Z") },
        ...["2026-10-21T12:00:00Z", "2026-10-21T13:00:00Z", "2026-10-22T12:00:00Z"].map(date =>
            ({ userId: user.id, gameId: "driver-dle", points: 10, metricMs: 6, playedAt: new Date(date) })),
    ]);
    const data = await service.list(user.id, now);
    expect(data.items.map(c => [c.id, c.progress])).toEqual([["reaction", 1], ["drivers", 2], ["regular", 3]]);
});

it("requires a retained championship pronostic on a session that has started this week", async () => {
    const user = await createUser("prono_week");
    const season = await createActiveSeason();
    const { prediction } = await createOpenPrediction();
    const now = new Date("2026-10-25T20:00:00Z");
    await prediction.update({ closesAt: new Date("2026-10-25T19:00:00Z") });
    const prono = await PronosticModel.create({ userId: user.id, predictionId: prediction.id, pointsStaked: 0,
        scoringModel: "fixed_reward", seasonId: season.id, rewardPointsSnapshot: 100,
        status: "lost", submittedAt: new Date("2026-10-24T12:00:00Z") } as any);
    expect((await service.list(user.id, now)).items.find(c => c.id === "prono")?.completed).toBe(true);
    await prono.update({ status: "void" });
    expect((await service.list(user.id, now)).items.find(c => c.id === "prono")?.progress).toBe(0);
    await prono.update({ status: "submitted" });
    await prediction.update({ closesAt: new Date("2026-10-25T21:00:00Z") });
    expect((await service.list(user.id, now)).items.find(c => c.id === "prono")?.progress).toBe(0);
    await PredictionModel.update({ voidedAt: now }, { where: { id: prediction.id } });
    expect((await service.list(user.id, now)).items.some(c => c.id === "prono")).toBe(false);
});

it("rejects incomplete, unknown and expired claims", async () => {
    const user = await createUser("incomplete");
    const week = weekWindow().key;
    await expect(service.claim(user.id, "reaction", week)).rejects.toMatchObject({ code: "CHALLENGE_INCOMPLETE" });
    await expect(service.claim(user.id, "invented", week)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.claim(user.id, "reaction", "2020-01-01")).rejects.toMatchObject({ code: "CHALLENGE_EXPIRED" });
    expect(await garageService.getBalance(user.id)).toBe(0);
});

it("credits exactly once for concurrent requests, isolates users, and resets next week", async () => {
    const user = await createUser("claimant");
    const other = await createUser("other");
    await GamePlayModel.bulkCreate(Array.from({ length: 5 }, () => ({ userId: user.id, gameId: "reaction", points: 10, metricMs: 200 })));
    const week = weekWindow().key;
    const results = await Promise.all(Array.from({ length: 8 }, () => service.claim(user.id, "reaction", week)));
    expect(results.reduce((sum, r) => sum + r.rewarded, 0)).toBe(75);
    expect(await garageService.getBalance(user.id)).toBe(75);
    expect(await GarageTransactionModel.count()).toBe(1);
    expect((await ProfileModel.findOne({ where: { userId: user.id } }))!.points).toBe(500);
    expect((await service.list(user.id)).items.find(c => c.id === "reaction")?.claimed).toBe(true);
    await expect(service.claim(other.id, "reaction", week)).rejects.toMatchObject({ code: "CHALLENGE_INCOMPLETE" });
    const next = await service.list(user.id, weekWindow().end);
    expect(next.items.find(c => c.id === "reaction")).toMatchObject({ progress: 0, claimed: false });
});

it("protects HTTP routes and ignores a client reward amount", async () => {
    const user = await createUser("http_challenge");
    const app = createApp();
    expect((await request(app).get("/api/v1/challenges/weekly")).status).toBe(401);
    const token = signAccessToken({ id: user.id, roles: ["user"] });
    await GamePlayModel.bulkCreate(Array.from({ length: 5 }, () => ({ userId: user.id, gameId: "reaction", points: 10, metricMs: 200 })));
    const response = await request(app).post("/api/v1/challenges/weekly/reaction/claim")
        .set("Authorization", `Bearer ${token}`).send({ week: weekWindow().key, reward: 999999 });
    expect(response.status).toBe(200);
    expect(response.body.rewarded).toBe(75);
});
