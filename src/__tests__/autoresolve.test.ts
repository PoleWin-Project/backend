jest.mock("../common/clients/openf1.client");

import { openf1Client } from "../common/clients/openf1.client";
import { autoResolve } from "../modules/predictions/predictions.autoresolve";

const mockGet = openf1Client.get as jest.Mock;

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function makeOfficialResults() {
    return makeRacePositions().map((p) => ({
        position: p.position,
        driver_number: p.driver_number,
        number_of_laps: p.position <= 6 ? 71 : 20,
        dnf: [55, 11, 14, 77, 18].includes(p.driver_number),
        dns: false,
        dsq: false,
        duration: null,
        gap_to_leader: null,
        meeting_key: 1,
        session_key: SESSION_KEY,
    }));
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

// ── Setup ──────────────────────────────────────────────────────────────────────

const SESSION_KEY = 11315;

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("autoResolve — classement officiel obligatoire", () => {
    it("retourne null tant que session_result est vide, même si date_end est dépassée", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/session_result") return Promise.resolve([]);
            if (path === "/position") return Promise.resolve(makeRacePositions());
            return Promise.resolve([]);
        });

        const types = ["RACE_WINNER", "SPRINT_WINNER", "POLE_POSITION",
            "FASTEST_LAP", "DNF", "SAFETY_CAR", "PODIUM"] as const;

        for (const type of types) {
            const result = await autoResolve(type, SESSION_KEY);
            expect(result).toBeNull();
        }

        // Le classement live ne doit jamais servir à attribuer les points.
        expect(mockGet).toHaveBeenCalledWith(
            "/session_result",
            { session_key: SESSION_KEY },
            undefined,
            { forceRefresh: true, cacheTtlMs: 60_000 },
        );
        expect(mockGet).not.toHaveBeenCalledWith("/position", expect.anything());
        expect(mockGet).not.toHaveBeenCalledWith("/laps", expect.anything());
    });
});

// ── RACE_WINNER ────────────────────────────────────────────────────────────────

describe("autoResolve — RACE_WINNER (GP Autriche 2026)", () => {
    beforeEach(() => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
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
            if (path === "/session_result") return Promise.resolve([]);
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
            if (path === "/session_result") return Promise.resolve([
                { driver_number: 4, position: 1 },
                { driver_number: 1, position: 2 },
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
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
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
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
            if (path === "/laps") return Promise.resolve(lapsWithPitOut);
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });

        const result = await autoResolve("FASTEST_LAP", SESSION_KEY);
        expect(result).toBe("ANT");
    });

    it("retourne null si aucun tour valide", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
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
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
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
        mockGet.mockImplementation((path: string) => {
            if (path === "/session_result") return Promise.resolve(
                makeOfficialResults().map((r) => ({ ...r, dnf: false })),
            );
            return Promise.resolve([]);
        });

        const result = await autoResolve("DNF", SESSION_KEY);
        expect(result).toBe("NONE");
    });

    it("retourne null tant que le classement officiel n'est pas publié", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/session_result") return Promise.resolve([]);
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
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
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
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
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
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
            if (path === "/race_control") return Promise.resolve([
                { message: "NEUTRALISATION", flag: "SC" },
            ]);
            return Promise.resolve([]);
        });

        const result = await autoResolve("SAFETY_CAR", SESSION_KEY);
        expect(result).toBe("YES");
    });

    it("retourne NO quand un VIRTUAL SAFETY CAR est présent au lieu d'un vrai", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
            if (path === "/race_control") return Promise.resolve([
                { message: "VIRTUAL SAFETY CAR DEPLOYED", flag: "VSC" },
            ]);
            return Promise.resolve([]);
        });

        const result = await autoResolve("SAFETY_CAR", SESSION_KEY);
        expect(result).toBe("NO");
    });
});

// ── PODIUM ────────────────────────────────────────────────────────────────────

describe("autoResolve — PODIUM (GP Autriche 2026)", () => {
    beforeEach(() => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/session_result") return Promise.resolve(makeOfficialResults());
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
            if (path === "/session_result") return Promise.resolve([
                { driver_number: 63, position: 1 },
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
            if (path === "/session_result") return Promise.resolve([
                { driver_number: 12, position: 1 },
                { driver_number: 63, position: 2 },
            ]);
            if (path === "/drivers") return Promise.resolve(makeDrivers());
            return Promise.resolve([]);
        });
    });

    it("retourne ANT depuis le classement officiel", async () => {
        const result = await autoResolve("POLE_POSITION", SESSION_KEY);
        expect(result).toBe("ANT");
    });

    it("retourne null si le classement officiel de la qualif est indisponible", async () => {
        mockGet.mockImplementation((path: string) => {
            if (path === "/session_result") return Promise.resolve([]);
            return Promise.resolve([]);
        });

        const result = await autoResolve("POLE_POSITION", SESSION_KEY);
        expect(result).toBeNull();
    });
});
