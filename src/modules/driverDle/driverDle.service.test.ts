import {
    DriverDleService,
    compareDrivers,
    type DriverDleDriver,
} from "./driverDle.service";
import { getDailyLimit } from "../games/games.service";

// computePodiums fait un fetch brut vers Ergast/Jolpi : on le neutralise.
beforeAll(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

function driver(overrides: Partial<DriverDleDriver> = {}): DriverDleDriver {
    return {
        driverId:             "1",
        fullName:             "Max VERSTAPPEN",
        teamName:             "Red Bull Racing",
        nationality:          "Dutch",
        driverNumber:         1,
        debutYear:            2015,
        headshotUrl:          "u1",
        wins:                 9,
        podiums:              14,
        ...overrides,
    };
}

// ── compareDrivers ───────────────────────────────────────────────────────────

describe("compareDrivers", () => {
    it("marque tous les attributs 'exact' quand le pilote deviné est la cible", () => {
        const target = driver();
        const fb = compareDrivers(driver(), target);

        expect(fb.team.status).toBe("exact");
        expect(fb.nationality.status).toBe("exact");
        expect(fb.debutYear.status).toBe("exact");
        expect(fb.wins.status).toBe("exact");
        expect(fb.podiums.status).toBe("exact");
    });

    it("marque l'écurie 'wrong' quand elle diffère", () => {
        const guess = driver({ teamName: "Ferrari" });
        const target = driver({ teamName: "Red Bull Racing" });
        const fb = compareDrivers(guess, target);
        expect(fb.team.status).toBe("wrong");
        expect(fb.team.value).toBe("Ferrari");
    });

    it("compare l'écurie sans tenir compte de la casse/espaces", () => {
        const fb = compareDrivers(
            driver({ teamName: "  red bull racing " }),
            driver({ teamName: "Red Bull Racing" }),
        );
        expect(fb.team.status).toBe("exact");
    });

    it("indique 'higher' quand la cible a une valeur numérique plus grande", () => {
        const guess = driver({ debutYear: 2015, wins: 1, podiums: 2 });
        const target = driver({ debutYear: 2019, wins: 9, podiums: 14 });
        const fb = compareDrivers(guess, target);
        expect(fb.debutYear.status).toBe("higher");
        expect(fb.wins.status).toBe("higher");
        expect(fb.podiums.status).toBe("higher");
    });

    it("indique 'lower' quand la cible a une valeur numérique plus petite", () => {
        const guess = driver({ debutYear: 2019, wins: 9, podiums: 14 });
        const target = driver({ debutYear: 2007, wins: 1, podiums: 3 });
        const fb = compareDrivers(guess, target);
        expect(fb.debutYear.status).toBe("lower");
        expect(fb.wins.status).toBe("lower");
        expect(fb.podiums.status).toBe("lower");
    });

    it("cas limite d'égalité : valeurs identiques ⇒ 'exact', pas de flèche", () => {
        const fb = compareDrivers(
            driver({ wins: 5, podiums: 5 }),
            driver({ wins: 5, podiums: 5 }),
        );
        expect(fb.wins.status).toBe("exact");
        expect(fb.podiums.status).toBe("exact");
    });

    it("préserve la valeur devinée (et non celle de la cible)", () => {
        const fb = compareDrivers(driver({ wins: 3 }), driver({ wins: 9 }));
        expect(fb.wins.value).toBe(3);
    });
});

// ── getDailyLimit ────────────────────────────────────────────────────────────

describe("getDailyLimit", () => {
    it("renvoie 1 pour driver-dle", () => {
        expect(getDailyLimit("driver-dle")).toBe(1);
    });
    it("renvoie le défaut (3) pour les autres jeux", () => {
        expect(getDailyLimit("reaction")).toBe(3);
        expect(getDailyLimit("unknown-game")).toBe(3);
    });
});

// ── Service : dataset, cible & guess ─────────────────────────────────────────

function buildService() {
    const openf1 = {
        getDrivers: jest.fn().mockResolvedValue([
            { driver_number: 1,  full_name: "Max VERSTAPPEN", team_name: "Red Bull Racing", headshot_url: "u1", country_code: "NED" },
            { driver_number: 44, full_name: "Lewis HAMILTON",  team_name: "Ferrari",         headshot_url: "u2", country_code: "GBR" },
        ]),
        getDriverStandings: jest.fn().mockResolvedValue([
            { driver_number: 1,  position: "1", wins: "9", driver: { nationality: "Dutch" } },
            { driver_number: 44, position: "5", wins: "2", driver: { nationality: "British" } },
        ]),
    };
    const games = {
        countPlaysToday: jest.fn().mockResolvedValue(0),
        rewardUser:      jest.fn().mockResolvedValue({ rewarded: 50 }),
        recordFalseStart: jest.fn().mockResolvedValue({}),
    };
    const svc = new DriverDleService(openf1 as any, games as any);
    return { svc, openf1, games };
}

describe("DriverDleService.getTargetDriver", () => {
    it("est déterministe pour une date donnée", async () => {
        const { svc } = buildService();
        const dataset = await svc.getDataset();
        const a = svc.getTargetDriver(dataset, new Date("2026-07-17T12:00:00Z"));
        const b = svc.getTargetDriver(dataset, new Date("2026-07-17T23:59:00Z"));
        expect(a.driverId).toBe(b.driverId);
        expect(dataset.some((d) => d.driverId === a.driverId)).toBe(true);
    });
});

describe("DriverDleService.guess", () => {
    it("refuse le guess quand le quota du jour est atteint (1 partie/jour)", async () => {
        const { svc, games } = buildService();
        games.countPlaysToday.mockResolvedValue(1);
        await expect(svc.guess(7, "1", false)).rejects.toMatchObject({ statusCode: 403 });
    });

    it("récompense et révèle la solution en cas de victoire", async () => {
        const { svc, games } = buildService();
        const dataset = await svc.getDataset();
        const target = svc.getTargetDriver(dataset);

        const res = await svc.guess(7, target.driverId, false);

        expect(res.found).toBe(true);
        expect(res.gameOver).toBe(true);
        expect(res.attemptsUsed).toBe(1);
        expect(res.pointsEarned).toBe(50); // 1er essai
        expect(res.solution?.driverId).toBe(target.driverId);
        expect(games.rewardUser).toHaveBeenCalledWith(7, 50, "driver-dle", false, 1);
    });

    it("renvoie un feedback sans terminer la partie sur un mauvais guess", async () => {
        const { svc, games } = buildService();
        const dataset = await svc.getDataset();
        const target = svc.getTargetDriver(dataset);
        const wrong = dataset.find((d) => d.driverId !== target.driverId)!;

        const res = await svc.guess(7, wrong.driverId, false);

        expect(res.found).toBe(false);
        expect(res.gameOver).toBe(false);
        expect(res.attemptsUsed).toBe(1);
        expect(res.solution).toBeUndefined();
        expect(games.rewardUser).not.toHaveBeenCalled();
    });

    it("consomme le quota (défaite neutre) au 6e essai raté", async () => {
        const { svc, games } = buildService();
        const dataset = await svc.getDataset();
        const target = svc.getTargetDriver(dataset);
        const wrong = dataset.find((d) => d.driverId !== target.driverId)!;

        let res: any;
        for (let i = 0; i < 6; i++) {
            res = await svc.guess(7, wrong.driverId, false);
        }

        expect(res.attemptsUsed).toBe(6);
        expect(res.gameOver).toBe(true);
        expect(res.found).toBe(false);
        expect(res.solution?.driverId).toBe(target.driverId);
        expect(games.recordFalseStart).toHaveBeenCalledWith(7, "driver-dle", false);
        expect(games.rewardUser).not.toHaveBeenCalled();
    });
});
