/**
 * Tests d'intégration du modèle « championship » (sans mise) sur un vrai PostgreSQL.
 * Couvre le plan de tests du MIGRATION_SIMULATED_GAMBLING_PLAN.md (§14, T1 → T21).
 *
 *   npm run test:db
 */
// expo-server-sdk est un module ESM que ts-jest ne sait pas charger : on neutralise
// l'envoi de notifications (aucun push réel pendant les tests).
jest.mock("../../modules/push/push.service", () => ({
    notifyUser: jest.fn().mockResolvedValue(undefined),
    broadcastToAll: jest.fn().mockResolvedValue(undefined),
    PushService: jest.fn().mockImplementation(() => ({
        register: jest.fn(),
        unregister: jest.fn(),
    })),
}));

import fs from "fs";
import path from "path";
import request from "supertest";
import { env } from "../../config/env";
import {
    ChampionshipScoreEventModel,
    GamePlayModel,
    PredictionRewardOptionModel,
    ProfileModel,
    PronosticModel,
    SeasonScoreModel,
    SeasonModel,
    SeasonFinalStandingModel,
} from "../../database/models";
import { seasonsService } from "../../modules/seasons/seasons.service";
import { OpenF1Service } from "../../modules/openf1/openf1.service";
import { PredictionsService } from "../../modules/predictions/predictions.service";
import { GamesService } from "../../modules/games/games.service";
import { garageService } from "../../modules/garage/garage.service";
import { championshipService } from "../../modules/championship/championship.service";
import { ChampionshipLeaderboardService } from "../../modules/leaderboard/leaderboard.championship.service";
import { createApp } from "../../app";
import { signAccessToken } from "../../common/utils/jwt";
import {
    closeDb,
    createActiveSeason,
    createOpenPrediction,
    createUser,
    FAKE_STANDINGS,
    resetDb,
    setupDb,
} from "./helpers";

const predictions = new PredictionsService();
const games = new GamesService();
const leaderboard = new ChampionshipLeaderboardService();

beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined); // logs Umzug
    await setupDb();
});

beforeEach(async () => {
    await resetDb();
    jest.spyOn(OpenF1Service.prototype, "getDriverStandings").mockResolvedValue(FAKE_STANDINGS);
    env.scoringModel = "championship";
    env.legacyClientPolicy = "accept";
    env.predictionsFrozen = false;
});

afterAll(async () => {
    await closeDb();
});

async function seasonPoints(userId: number) {
    const row = await SeasonScoreModel.findOne({ where: { userId } });
    return row?.points ?? 0;
}

describe("Historique des saisons", () => {
    it("retourne uniquement les archives du joueur, dans l'ordre des saisons", async () => {
        const user = await createUser("history");
        const other = await createUser("other");
        const active = await createActiveSeason();
        const beta = await SeasonModel.create({ code: "beta", name: "Saison Bêta", status: "archived", startsAt: new Date("2025-01-01"), endsAt: new Date("2025-12-31"), archivedAt: new Date() });
        const recent = await SeasonModel.create({ code: "past", name: "Saison passée", status: "archived", startsAt: new Date("2026-01-01"), endsAt: new Date("2026-09-30"), archivedAt: new Date() });
        await SeasonFinalStandingModel.bulkCreate([
            { seasonId: beta.id, userId: user.id, finalRank: 3, finalScore: 800, participants: 20, stats: { correct: 6, incorrect: 4, resolved: 10 } },
            { seasonId: recent.id, userId: user.id, finalRank: 2, finalScore: 900, participants: 30, stats: { correct: 8, incorrect: 2, resolved: 10 } },
            { seasonId: active.id, userId: user.id, finalRank: 1, finalScore: 100, participants: 5, stats: {} },
            { seasonId: beta.id, userId: other.id, finalRank: 10, finalScore: 10, participants: 20, stats: {} },
        ]);
        expect(await seasonsService.getHistory(user.id)).toEqual([
            { seasonCode: "past", seasonName: "Saison passée", rank: 2, participants: 30, stats: { correct: 8, incorrect: 2, resolved: 10 } },
            { seasonCode: "beta", seasonName: "Saison Bêta", rank: 3, participants: 20, stats: { correct: 6, incorrect: 4, resolved: 10 } },
        ]);
        expect(await seasonsService.getHistory(-1)).toEqual([]);
    });
});

// ── Placement ────────────────────────────────────────────────────────────────

describe("Placement d'un pronostic (sans mise)", () => {
    it("T1 — crée le pronostic sans débit, sans mise, avec récompense snapshotée", async () => {
        await createActiveSeason();
        const user = await createUser("alice");
        const { prediction } = await createOpenPrediction();

        const pronostic = await predictions.placePronostic(user.id, prediction.id, { value: "str" });

        expect(pronostic!.scoringModel).toBe("fixed_reward");
        expect(pronostic!.pointsStaked).toBe(0);
        expect(pronostic!.rewardPointsSnapshot).toBe(300);       // 18e au championnat
        expect(pronostic!.detail!.value).toBe("STR");            // normalisé
        const profile = await ProfileModel.findOne({ where: { userId: user.id } });
        expect(profile!.points).toBe(500);                       // aucun débit
        expect(await garageService.getBalance(user.id)).toBe(0); // aucun lien avec le Garage
    });

    it("un choix évident rapporte moins qu'un choix difficile", async () => {
        await createActiveSeason();
        const [a, b] = [await createUser("a"), await createUser("b")];
        const { prediction } = await createOpenPrediction();
        const easy = await predictions.placePronostic(a.id, prediction.id, { value: "VER" });
        const hard = await predictions.placePronostic(b.id, prediction.id, { value: "STR" });
        expect(easy!.rewardPointsSnapshot).toBe(100);
        expect(hard!.rewardPointsSnapshot).toBeGreaterThan(easy!.rewardPointsSnapshot!);
    });

    it("T2 — une mise envoyée par un ancien client est ignorée (policy accept)", async () => {
        await createActiveSeason();
        const user = await createUser("bob");
        const { prediction } = await createOpenPrediction();
        const p = await predictions.placePronostic(user.id, prediction.id, { value: "HAM", pointsStaked: 500 });
        expect(p!.pointsStaked).toBe(0);
        expect((await ProfileModel.findOne({ where: { userId: user.id } }))!.points).toBe(500);
    });

    it("T2 — une mise envoyée par un ancien client est refusée en 426 (policy reject)", async () => {
        env.legacyClientPolicy = "reject";
        await createActiveSeason();
        const user = await createUser("carl");
        const { prediction } = await createOpenPrediction();
        await expect(
            predictions.placePronostic(user.id, prediction.id, { value: "HAM", pointsStaked: 50 }),
        ).rejects.toMatchObject({ statusCode: 426 });
    });

    it("refuse une valeur invalide pour le type de prédiction", async () => {
        await createActiveSeason();
        const user = await createUser("dan");
        const { prediction } = await createOpenPrediction();
        await expect(predictions.placePronostic(user.id, prediction.id, { value: "Lewis" }))
            .rejects.toMatchObject({ statusCode: 422 });
    });

    it("T11 — placements concurrents du même pronostic : un seul succès", async () => {
        await createActiveSeason();
        const user = await createUser("eve");
        const { prediction } = await createOpenPrediction();
        await predictions.getById(prediction.id); // barème généré avant la rafale

        const results = await Promise.allSettled(
            Array.from({ length: 5 }, () => predictions.placePronostic(user.id, prediction.id, { value: "HAM" })),
        );
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
        expect(await PronosticModel.count({ where: { userId: user.id } })).toBe(1);
    });

    it("gel de maintenance : 503", async () => {
        env.predictionsFrozen = true;
        await createActiveSeason();
        const user = await createUser("fred");
        const { prediction } = await createOpenPrediction();
        await expect(predictions.placePronostic(user.id, prediction.id, { value: "HAM" }))
            .rejects.toMatchObject({ statusCode: 503 });
    });

    it("T5 — modifier le choix re-snapshote la récompense", async () => {
        await createActiveSeason();
        const user = await createUser("gina");
        const { prediction } = await createOpenPrediction();
        await predictions.placePronostic(user.id, prediction.id, { value: "VER" });
        const updated = await predictions.updatePronostic(user.id, prediction.id, { value: "STR" });
        expect(updated!.detail!.value).toBe("STR");
        expect(updated!.rewardPointsSnapshot).toBe(300);
    });
});

// ── Résolution ───────────────────────────────────────────────────────────────

describe("Résolution", () => {
    it("T6/T7/T8 — correct : +snapshot ; incorrect : 0, rien n'est retiré", async () => {
        await createActiveSeason();
        const [winner, loser] = [await createUser("win"), await createUser("lose")];
        const { prediction } = await createOpenPrediction();
        await predictions.placePronostic(winner.id, prediction.id, { value: "STR" });
        await predictions.placePronostic(loser.id, prediction.id, { value: "VER" });

        await predictions.resolve(prediction.id, { winningValue: "STR" });

        expect(await seasonPoints(winner.id)).toBe(300);
        expect(await seasonPoints(loser.id)).toBe(0);
        const lost = await PronosticModel.findOne({ where: { userId: loser.id } });
        expect(lost!.status).toBe("lost");
        expect(lost!.championshipPointsAwarded).toBe(0);
        expect(await ChampionshipScoreEventModel.count({ where: { userId: loser.id } })).toBe(0);
        // profiles.points (ancien solde) n'est jamais touché par le nouveau modèle.
        expect((await ProfileModel.findOne({ where: { userId: loser.id } }))!.points).toBe(500);
    });

    it("T4 — un changement de barème après validation ne change pas les points attribués", async () => {
        await createActiveSeason();
        const user = await createUser("hugo");
        const { prediction } = await createOpenPrediction();
        await predictions.placePronostic(user.id, prediction.id, { value: "STR" });

        await PredictionRewardOptionModel.update(
            { rewardPoints: 999 },
            { where: { predictionId: prediction.id, optionValue: "STR" } },
        );
        await predictions.resolve(prediction.id, { winningValue: "STR" });

        expect(await seasonPoints(user.id)).toBe(300);
    });

    it("T9 — double résolution séquentielle : aucune double attribution", async () => {
        await createActiveSeason();
        const user = await createUser("ivy");
        const { prediction } = await createOpenPrediction();
        await predictions.placePronostic(user.id, prediction.id, { value: "HAM" });

        await predictions.resolve(prediction.id, { winningValue: "HAM" });
        const second = await predictions.resolve(prediction.id, { winningValue: "HAM" });

        expect(second.resolved).toBe(0);
        expect(await seasonPoints(user.id)).toBe(100);
        expect(await ChampionshipScoreEventModel.count()).toBe(1);
    });

    it("T10 — résolutions CONCURRENTES (scheduler + admin + instances) : un seul événement", async () => {
        await createActiveSeason();
        const users = await Promise.all(["j1", "j2", "j3"].map((u) => createUser(u)));
        const { prediction } = await createOpenPrediction();
        for (const u of users) await predictions.placePronostic(u.id, prediction.id, { value: "HAM" });

        await Promise.all(Array.from({ length: 8 }, () => predictions.resolve(prediction.id, { winningValue: "HAM" })));

        expect(await ChampionshipScoreEventModel.count()).toBe(3);
        for (const u of users) expect(await seasonPoints(u.id)).toBe(100);
        const season = (await SeasonScoreModel.findOne())!.seasonId;
        expect(await championshipService.findScoreDrifts(season)).toEqual([]);
    });

    it("la base refuse un événement de pronostic négatif ou nul", async () => {
        const season = await createActiveSeason();
        const user = await createUser("kim");
        await expect(ChampionshipScoreEventModel.create({
            seasonId: season.id, userId: user.id, sourceType: "pronostic", sourceId: 1, points: -50,
            reason: null, createdBy: null,
        })).rejects.toThrow();
    });

    it("la base refuse un pronostic fixed_reward avec une mise", async () => {
        const season = await createActiveSeason();
        const user = await createUser("leo");
        const { prediction } = await createOpenPrediction();
        await expect(PronosticModel.create({
            userId: user.id, predictionId: prediction.id, pointsStaked: 100, status: "submitted",
            scoringModel: "fixed_reward", seasonId: season.id, rewardPointsSnapshot: 100,
        } as any)).rejects.toThrow();
    });
});

// ── Classement ───────────────────────────────────────────────────────────────

describe("Classement de saison", () => {
    it("T12 — égalité : rang partagé", async () => {
        await createActiveSeason();
        const [a, b, c] = [await createUser("ra"), await createUser("rb"), await createUser("rc")];
        const { prediction } = await createOpenPrediction();
        await predictions.placePronostic(a.id, prediction.id, { value: "HAM" });
        await predictions.placePronostic(b.id, prediction.id, { value: "HAM" });
        await predictions.placePronostic(c.id, prediction.id, { value: "VER" });
        await predictions.resolve(prediction.id, { winningValue: "HAM" });

        const { items } = await leaderboard.getGlobal(10, 0, "points");
        const rankOf = (id: number) => items.find((i) => i.userId === id)!.rank;
        expect(rankOf(a.id)).toBe(1);
        expect(rankOf(b.id)).toBe(1);
        expect(rankOf(c.id)).toBe(3);
        expect((await leaderboard.getMyRank(b.id)).rank).toBe(1);
    });

    it("les crédits Garage n'influencent pas le classement", async () => {
        await createActiveSeason();
        const [rich, poor] = [await createUser("rich"), await createUser("poor")];
        await garageService.applyMovement({ userId: rich.id, amount: 5000, kind: "admin_adjustment", idempotencyKey: "t:1" });
        const { items } = await leaderboard.getGlobal(10, 0, "points");
        expect(items.find((i) => i.userId === rich.id)!.points).toBe(0);
        expect(items.find((i) => i.userId === poor.id)!.points).toBe(0);
    });
});

// ── Crédits Garage & mini-jeux ───────────────────────────────────────────────

describe("Crédits Garage", () => {
    it("ledger idempotent : la même clé ne crédite qu'une fois", async () => {
        const user = await createUser("gar");
        await garageService.applyMovement({ userId: user.id, amount: 100, kind: "mission", idempotencyKey: "m:1" });
        const again = await garageService.applyMovement({ userId: user.id, amount: 100, kind: "mission", idempotencyKey: "m:1" });
        expect(again.duplicated).toBe(true);
        expect(await garageService.getBalance(user.id)).toBe(100);
    });

    it("T17 (prép.) — un débit supérieur au solde est refusé", async () => {
        const user = await createUser("spend");
        await garageService.applyMovement({ userId: user.id, amount: 50, kind: "mission", idempotencyKey: "m:2" });
        await expect(
            garageService.applyMovement({ userId: user.id, amount: -80, kind: "cosmetic_purchase", idempotencyKey: "p:1" }),
        ).rejects.toMatchObject({ statusCode: 422 });
        expect(await garageService.getBalance(user.id)).toBe(50);
    });

    it("T20 — mini-jeu : montant calculé serveur, crédité en Garage, jamais en championnat", async () => {
        await createActiveSeason();
        const user = await createUser("react");
        const res = await games.claimReward(user.id, "reaction", 150, false);

        expect(res.currency).toBe("garage_credits");
        expect(res.rewarded).toBe(15);                                      // barème serveur
        expect(await garageService.getBalance(user.id)).toBe(15);
        expect(await seasonPoints(user.id)).toBe(0);
        expect((await ProfileModel.findOne({ where: { userId: user.id } }))!.points).toBe(500);
    });

    it("T20 — gameId inventé / non réclamable : refusé", async () => {
        const user = await createUser("cheat");
        await expect(games.claimReward(user.id, "farm-123", 100, false)).rejects.toMatchObject({ statusCode: 400 });
        await expect(games.claimReward(user.id, "driver-dle", 1, false)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("T20 — quota journalier respecté même en rafale concurrente", async () => {
        const user = await createUser("burst");
        const results = await Promise.allSettled(
            Array.from({ length: 6 }, () => games.claimReward(user.id, "reaction", 200, false)),
        );
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
        expect(await GamePlayModel.count({ where: { userId: user.id } })).toBe(3);
    });
});

// ── Annulation / suppression ─────────────────────────────────────────────────

describe("Annulation de prédiction", () => {
    it("T21 — suppression refusée si des pronostics existent ; annulation sans aucun point", async () => {
        await createActiveSeason();
        const user = await createUser("void");
        const { prediction } = await createOpenPrediction();
        await predictions.placePronostic(user.id, prediction.id, { value: "HAM" });

        await expect(predictions.delete(prediction.id)).rejects.toMatchObject({ statusCode: 409 });
        const res = await predictions.voidPrediction(prediction.id);

        expect(res.voided).toBe(1);
        expect((await PronosticModel.findOne({ where: { userId: user.id } }))!.status).toBe("void");
        expect(await seasonPoints(user.id)).toBe(0);
    });
});

// ── API HTTP ─────────────────────────────────────────────────────────────────

describe("API (mode championship)", () => {
    it("POST /pronostic ignore la mise, GET /predictions expose « N points si correct »", async () => {
        await createActiveSeason();
        const user = await createUser("http");
        const { session, prediction } = await createOpenPrediction();
        const app = createApp();
        const token = signAccessToken({ id: user.id, roles: ["user"] });

        const list = await request(app).get(`/api/v1/predictions/sessions/${session.id}/predictions`);
        expect(list.status).toBe(200);
        const options = list.body.predictions[0].rewardOptions;
        expect(options.find((o: any) => o.value === "STR").rewardPoints).toBe(300);
        expect(JSON.stringify(list.body)).not.toMatch(/multiplier|odds|cote/i);

        const placed = await request(app)
            .post(`/api/v1/predictions/${prediction.id}/pronostic`)
            .set("Authorization", `Bearer ${token}`)
            .send({ value: "STR", pointsStaked: 250 });
        expect(placed.status).toBe(201);
        expect(placed.body.pronostic.pointsStaked).toBe(0);
        expect(placed.body.pronostic.rewardPointsSnapshot).toBe(300);
    });

    it("POST /games/reward ignore le montant envoyé par le client", async () => {
        const user = await createUser("httpgame");
        const app = createApp();
        const token = signAccessToken({ id: user.id, roles: ["user"] });
        const res = await request(app)
            .post("/api/v1/games/reward")
            .set("Authorization", `Bearer ${token}`)
            .send({ gameId: "reaction", metricMs: 400, points: 100 });
        expect(res.status).toBe(200);
        expect(res.body.rewarded).toBeLessThan(10);
    });
});

// ── Garde-fous statiques ─────────────────────────────────────────────────────

describe("Séparation des deux ressources (statique)", () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, "../../modules", rel), "utf8");

    it("T18 — le module pronostics n'importe jamais le Garage", () => {
        for (const f of ["predictions/predictions.service.ts", "predictions/predictions.repository.ts", "championship/championship.service.ts"]) {
            expect(read(f)).not.toMatch(/from ["'][^"']*garage/);
        }
    });

    it("T19 — aucune méthode ne décrémente season_scores", () => {
        const src = read("championship/championship.service.ts");
        expect(src).not.toMatch(/points\s*=\s*points\s*-/);
    });
});
