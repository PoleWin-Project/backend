jest.mock("../../common/clients/openf1.client");

import { openf1Client } from "../common/clients/openf1.client";
import { autoResolve } from "../modules/predictions/predictions.autoresolve";

const mockGet = openf1Client.get as jest.Mock;

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSession(dateEnd: string) {
    return [{ session_key: 11315, session_name: "Race", date_start: "2026-06-28T13:00:00+00:00", date_end: dateEnd }];
}

function makeDrivers() {
    return [
        { driver_number: 63, name_acronym: "RUS" },
        { driver_number: 1, name_acronym: "VER" },
        { driver_number: 12, name_acronym: "ANT" },
        { driver_number: 4, name_acronym: "NOR" },
        { driver_number: 44, name_acronym: "HAM" },
        { driver_number: 16, name_acronym: "LEC" },
        { driver_number: 55, name_acronym: "SAI" },
        { driver_number: 11, name_acronym: "PER" },
        { driver_number: 14, name_acronym: "ALO" },
        { driver_number: 77, name_acronym: "BOT" },
        { driver_number: 18, name_acronym: "STR" },
        { driver_number: 10, name_acronym: "GAS" },
    ];
}

// Positions finales (données OpenF1 en fin de course)
function makeRacePositions() {
    const base = "2026-06-28T14:06:";
    return [
        { driver_number: 63, position: 1, date: base + "02.000Z" },
        { driver_number: 1, position: 2, date: base + "13.000Z" },
        { driver_number: 12, position: 3, date: base + "13.000Z" },
        { driver_number: 4, position: 4, date: base + "20.000Z" },
        { driver_number: 44, position: 5, date: base + "34.000Z" },
        { driver_number: 16, position: 6, date: base + "40.000Z" },
        // DNF drivers — dernière position connue beaucoup plus tôt
        { driver_number: 55, position: 12, date: "2026-06-28T13:45:00.000Z" },
        { driver_number: 11, position: 18, date: "2026-06-28T13:10:00.000Z" },
        { driver_number: 14, position: 9, date: "2026-06-28T14:05:00.000Z" },
        { driver_number: 77, position: 20, date: "2026-06-28T13:08:00.000Z" },
        { driver_number: 18, position: 15, date: "2026-06-28T13:55:00.000Z" },
    ];
}

// 71 tours de course — les DNF ont un dernier tour < 69 (71 - 2)
function makeRaceLaps() {
    const laps: object[] = [];
    const finishers = [
        { num: 63, maxLap: 71 }, // RUS
        { num: 1, maxLap: 71 }, // VER
        { num: 12, maxLap: 71 }, // ANT — fastest lap
        { num: 4, maxLap: 71 }, // NOR
        { num: 44, maxLap: 71 }, // HAM
        { num: 16, maxLap: 71 }, // LEC
        { num: 10, maxLap: 71 }, // GAS
        { num: 55, maxLap: 24 }, // SAI — DNF lap 24
        { num: 11, maxLap: 5 }, // PER — DNF lap 5
        { num: 14, maxLap: 68 }, // ALO — DNF lap 68
        { num: 77, maxLap: 3 }, // BOT — DNF lap 3
        { num: 18, maxLap: 46 }, // STR — DNF lap 46
    ];

    for (const { num, maxLap } of finishers) {
        for (let lap = 1; lap <= maxLap; lap++) {
            // ANT a le meilleur tour en course (70.374s au tour 68)
            const isAntFastestLap = num === 12 && lap === 68;
            laps.push({
                driver_number: num,
                lap_number: lap,
                lap_duration: isAntFastestLap ? 70.374 : 72 + Math.random(),
                is_pit_out_lap: false,
                date_start: `2026-06-28T13:${String(lap).padStart(2, "0")}:00.000Z`,
            });
        }
    }
    return laps;
}

// Tours de qualifs — 3 phases (Q1, Q2, Q3) séparées par > 5 min
function makeQualiLaps() {
    const laps: object[] = [];
    const drivers = [
        { num: 12, acronym: "ANT" }, { num: 63, acronym: "RUS" },
        { num: 1, acronym: "VER" }, { num: 4, acronym: "NOR" },
        { num: 44, acronym: "HAM" }, { num: 16, acronym: "LEC" },
        { num: 55, acronym: "SAI" }, { num: 11, acronym: "PER" },
        { num: 14, acronym: "ALO" }, { num: 10, acronym: "GAS" },
    ];

    // Q1 — 20 pilotes, tours lents (~80s), base à 14:00
    for (let i = 0; i < 20; i++) {
        laps.push({
            driver_number: i + 1, lap_number: 1, lap_duration: 82 + i * 0.1,
            is_pit_out_lap: false, date_start: `2026-06-27T14:0${Math.floor(i / 5)}:00.000Z`
        });
    }

    // Q2 — 15 pilotes, base à 14:25 (gap > 5 min après Q1)
    for (let i = 0; i < 15; i++) {
        laps.push({
            driver_number: i + 1, lap_number: 1, lap_duration: 79 + i * 0.1,
            is_pit_out_lap: false, date_start: `2026-06-27T14:2${Math.floor(i / 5)}:00.000Z`
        });
    }

    // Q3 — 10 pilotes, base à 14:50 (gap > 5 min après Q2) — ANT le plus rapide
    for (let i = 0; i < drivers.length; i++) {
        const { num } = drivers[i];
        // ANT (12) est le plus rapide en Q3
        const duration = num === 12 ? 74.5 : 75 + i * 0.2;
        laps.push({
            driver_number: num, lap_number: 1, lap_duration: duration,
            is_pit_out_lap: false, date_start: `2026-06-27T14:5${Math.floor(i / 3)}:00.000Z`
        });
    }

    return laps;
}

// ── Setup ──────────────────────────────────────────────────────────────────────

const SESSION_KEY = 11315;
const PAST_DATE = "2026-06-28T15:00:00+00:00"; // course terminée
const FUTURE_DATE = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // dans 2h

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("autoResolve — garde isSessionFinished", () => {
    it("retourne null pour tous les types si la session n'est pas terminée", async () => {
        mockGet.mockResolvedValue(makeSession(FUTURE_DATE));

        const types = ["RACE_WINNER", "SPRINT_WINNER", "POLE_POSITION",
            "FASTEST_LAP", "DNF", "SAFETY_CAR", "PODIUM"] as const;

        for (const type of types) {
            const result = await autoResolve(type, SESSION_KEY);
            expect(result).toBeNull();
        }

        // Aucun autre appel OpenF1 ne doit avoir été fait
        expect(mockGet).toHaveBeenCalledWith("/sessions", { session_key: SESSION_KEY });
        expect(mockGet).not.toHaveBeenCalledWith("/position", expect.anything());
        expect(mockGet).not.toHaveBeenCalledWith("/laps", expect.anything());
    });

    it("retourne null si date_end est absente (session sans fin définie)", async () => {
        mockGet.mockResolvedValue([{ session_key: SESSION_KEY, date_end: null }]);

        const result = await autoResolve("RACE_WINNER", SESSION_KEY);
        expect(result).toBeNull();
    });
});

// ── RACE_WINNER ────────────────────────────────────────────────────────────────

describe("autoResolve — RACE_WINNER (GP Autriche 2026)", () => {
    beforeEach(() => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/position") return Promise.resolve(makeRacePositions());
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });
    });

    it("retourne RUS (vainqueur de la course)", async () => {
        const result = await autoResolve("RACE_WINNER", SESSION_KEY);
        expect(result).toBe("RUS");
    });

    it("retourne null si aucun pilote en P1 dans les données OpenF1", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/position") return Promise.resolve([]); // pas de données
            return Promise.resolve([]);
        });

        const result = await autoResolve("RACE_WINNER", SESSION_KEY);
        expect(result).toBeNull();
    });
});

// ── SPRINT_WINNER ──────────────────────────────────────────────────────────────

describe("autoResolve — SPRINT_WINNER", () => {
    it("retourne le pilote en P1 (même logique que RACE_WINNER)", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/position") return Promise.resolve([
                { driver_number: 4, position: 1, date: "2026-07-04T12:00:00Z" }, // NOR gagne le sprint
                { driver_number: 1, position: 2, date: "2026-07-04T12:00:00Z" },
            ]);
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });

        const result = await autoResolve("SPRINT_WINNER", SESSION_KEY);
        expect(result).toBe("NOR");
    });
});

// ── FASTEST_LAP ────────────────────────────────────────────────────────────────

describe("autoResolve — FASTEST_LAP (GP Autriche 2026)", () => {
    beforeEach(() => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/laps") return Promise.resolve(makeRaceLaps());
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });
    });

    it("retourne ANT (meilleur tour en 70.374s)", async () => {
        const result = await autoResolve("FASTEST_LAP", SESSION_KEY);
        expect(result).toBe("ANT");
    });

    it("ignore les pit out laps dans le calcul", async () => {
        const lapsWithPitOut = [
            // ANT a un tour normal rapide
            { driver_number: 12, lap_number: 50, lap_duration: 70.374, is_pit_out_lap: false, date_start: "2026-06-28T14:00:00Z" },
            // RUS a un pit out lap encore plus rapide — doit être ignoré
            { driver_number: 63, lap_number: 30, lap_duration: 65.0, is_pit_out_lap: true, date_start: "2026-06-28T13:45:00Z" },
            { driver_number: 63, lap_number: 31, lap_duration: 73.0, is_pit_out_lap: false, date_start: "2026-06-28T13:46:00Z" },
        ];
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/laps") return Promise.resolve(lapsWithPitOut);
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });

        const result = await autoResolve("FASTEST_LAP", SESSION_KEY);
        expect(result).toBe("ANT");
    });

    it("retourne null si aucun tour valide", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/laps") return Promise.resolve([
                { driver_number: 63, lap_number: 1, lap_duration: null, is_pit_out_lap: false, date_start: "2026-06-28T13:01:00Z" },
            ]);
            return Promise.resolve([]);
        });

        const result = await autoResolve("FASTEST_LAP", SESSION_KEY);
        expect(result).toBeNull();
    });
});

// ── DNF ───────────────────────────────────────────────────────────────────────

describe("autoResolve — DNF (GP Autriche 2026)", () => {
    beforeEach(() => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/laps") return Promise.resolve(makeRaceLaps());
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });
    });

    it("retourne tous les 5 pilotes DNF (SAI, PER, ALO, BOT, STR)", async () => {
        const result = await autoResolve("DNF", SESSION_KEY);
        // L'ordre peut varier, on vérifie que tous les 5 sont présents
        const dnfs = result!.split(",").sort();
        expect(dnfs).toEqual(["ALO", "BOT", "PER", "SAI", "STR"].sort());
    });

    it("n'inclut PAS les pilotes qui ont terminé la course", async () => {
        const result = await autoResolve("DNF", SESSION_KEY);
        const dnfs = result!.split(",");
        expect(dnfs).not.toContain("RUS");
        expect(dnfs).not.toContain("VER");
        expect(dnfs).not.toContain("ANT");
    });

    it("retourne NONE quand tous les pilotes terminent", async () => {
        const allFinishLaps = makeDrivers().map(({ driver_number }) =>
            ({ driver_number, lap_number: 71, lap_duration: 72.0, is_pit_out_lap: false, date_start: "2026-06-28T14:06:00Z" })
        );
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/laps") return Promise.resolve(allFinishLaps);
            return Promise.resolve([]);
        });

        const result = await autoResolve("DNF", SESSION_KEY);
        expect(result).toBe("NONE");
    });

    it("retourne null si la course a à peine commencé (< 3 tours)", async () => {
        const earlyLaps = [
            { driver_number: 63, lap_number: 2, lap_duration: 72.0, is_pit_out_lap: false, date_start: "2026-06-28T13:02:00Z" },
        ];
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/laps") return Promise.resolve(earlyLaps);
            return Promise.resolve([]);
        });

        const result = await autoResolve("DNF", SESSION_KEY);
        expect(result).toBeNull();
    });
});

// ── SAFETY_CAR ────────────────────────────────────────────────────────────────

describe("autoResolve — SAFETY_CAR", () => {
    it("retourne NO quand aucun événement Safety Car (GP Autriche 2026)", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/race_control") return Promise.resolve([
                { message: "TRACK CLEAR", flag: null },
                { message: "DRS ENABLED", flag: null },
                { message: "PIT LANE OPEN", flag: null },
            ]);
            return Promise.resolve([]);
        });

        const result = await autoResolve("SAFETY_CAR", SESSION_KEY);
        expect(result).toBe("NO");
    });

    it("retourne YES quand un message SAFETY CAR est présent", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/race_control") return Promise.resolve([
                { message: "TRACK CLEAR", flag: null },
                { message: "SAFETY CAR DEPLOYED", flag: "SC" },
                { message: "SAFETY CAR IN THIS LAP", flag: null },
            ]);
            return Promise.resolve([]);
        });

        const result = await autoResolve("SAFETY_CAR", SESSION_KEY);
        expect(result).toBe("YES");
    });

    it("retourne YES quand le flag SC est présent même sans le mot dans le message", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/race_control") return Promise.resolve([
                { message: "NEUTRALISATION", flag: "SC" },
            ]);
            return Promise.resolve([]);
        });

        const result = await autoResolve("SAFETY_CAR", SESSION_KEY);
        expect(result).toBe("YES");
    });
});

// ── PODIUM ────────────────────────────────────────────────────────────────────

describe("autoResolve — PODIUM (GP Autriche 2026)", () => {
    beforeEach(() => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/position") return Promise.resolve(makeRacePositions());
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });
    });

    it("retourne RUS,VER,ANT dans l'ordre exact", async () => {
        const result = await autoResolve("PODIUM", SESSION_KEY);
        expect(result).toBe("RUS,VER,ANT");
    });

    it("retourne null si P2 ou P3 manquent dans les données OpenF1", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/position") return Promise.resolve([
                { driver_number: 63, position: 1, date: "2026-06-28T14:06:00Z" }, // seulement P1
            ]);
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });

        const result = await autoResolve("PODIUM", SESSION_KEY);
        expect(result).toBeNull();
    });
});

// ── POLE_POSITION ─────────────────────────────────────────────────────────────

describe("autoResolve — POLE_POSITION (Qualifs Autriche 2026)", () => {
    beforeEach(() => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/laps") return Promise.resolve(makeQualiLaps());
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });
    });

    it("retourne ANT (meilleur tour en Q3)", async () => {
        const result = await autoResolve("POLE_POSITION", SESSION_KEY);
        expect(result).toBe("ANT");
    });

    it("retourne null si aucun tour de qualifs valide", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/sessions") return Promise.resolve(makeSession(PAST_DATE));
            if (path === "/laps") return Promise.resolve([]);
            return Promise.resolve([]);
        });

        const result = await autoResolve("POLE_POSITION", SESSION_KEY);
        expect(result).toBeNull();
    });
});
