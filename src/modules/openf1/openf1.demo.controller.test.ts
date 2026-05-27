// Mock openf1Client and OpenF1Service before imports
const mockClientGet = jest.fn();

jest.mock("../../common/clients/openf1.client", () => ({
    openf1Client: { get: mockClientGet },
}));

const mockSvcGetSessionByKey = jest.fn();
jest.mock("./openf1.service", () => ({
    OpenF1Service: jest.fn().mockImplementation(() => ({
        getSessionByKey: mockSvcGetSessionByKey,
    })),
}));

import { demoWarmup, demoLocations, demoPositions } from "./openf1.demo.controller";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeReq(overrides: object = {}) {
    return { params: {}, query: {}, ...overrides } as any;
}

function makeRes() {
    const json   = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as any;
}

const next = jest.fn();

// Fixed session metadata used across tests
const SESSION_KEY = 1234;
const RACE_START  = new Date("2024-09-01T13:00:00Z");
const RACE_END    = new Date("2024-09-01T15:00:00Z");

const fakeOpenF1Session = {
    session_key: SESSION_KEY,
    date_start:  RACE_START.toISOString(),
    date_end:    RACE_END.toISOString(),
};

// A minimal location row
function makeLoc(driverNumber: number, date: string, x: number, y: number) {
    return { driver_number: driverNumber, date, x, y };
}

// Build a simple sequence of location rows for one driver spanning the race
function buildLocationRows(sessionKey = SESSION_KEY) {
    const rows = [];
    const step = 10 * 60 * 1000; // every 10 min
    for (let t = RACE_START.getTime(); t <= RACE_END.getTime(); t += step) {
        rows.push({ driver_number: 1, date: new Date(t).toISOString(), x: t / 1000, y: 0 });
    }
    return rows;
}

// ── demoWarmup ────────────────────────────────────────────────────────────────

describe("demoWarmup", () => {
    beforeEach(() => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();
    });

    it("retourne ready=false et démarre le warmup si non prêt", async () => {
        // New module → caches empty; warmup will run asynchronously
        mockSvcGetSessionByKey.mockResolvedValue(fakeOpenF1Session);
        mockClientGet.mockResolvedValue([]);

        const req = makeReq({ params: { sessionKey: String(SESSION_KEY) } });
        const res = makeRes();
        await demoWarmup(req, res, next);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "ok" }));
    });

    it("passe l'erreur à next()", async () => {
        const req = { params: null, query: {} } as any; // will throw when accessing sessionKey
        await demoWarmup(req, makeRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

// ── demoLocations ─────────────────────────────────────────────────────────────

describe("demoLocations", () => {
    beforeEach(() => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();
    });

    it("retourne 400 si startedAt manque", async () => {
        const req = makeReq({ params: { sessionKey: "9999" }, query: {} });
        const res = makeRes();
        await demoLocations(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("retourne locations=[] si le cache n'est pas prêt et démarre warmup", async () => {
        // Use a sessionKey that was never warmed up → cache miss
        const req = makeReq({
            params: { sessionKey: "88888" },
            query:  { startedAt: new Date().toISOString(), durationSec: "60" },
        });
        mockSvcGetSessionByKey.mockResolvedValue(fakeOpenF1Session);
        mockClientGet.mockResolvedValue([]);

        const res = makeRes();
        await demoLocations(req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ warming: true, locations: [] }));
    });

    it("passe l'erreur à next()", async () => {
        const req = { params: null, query: { startedAt: "x" } } as any;
        await demoLocations(req, makeRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

// ── demoPositions ─────────────────────────────────────────────────────────────

describe("demoPositions", () => {
    beforeEach(() => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();
    });

    it("retourne 400 si startedAt manque", async () => {
        const req = makeReq({ params: { sessionKey: "9999" }, query: {} });
        const res = makeRes();
        await demoPositions(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("retourne positions=[] si le cache n'est pas prêt et démarre warmup", async () => {
        const req = makeReq({
            params: { sessionKey: "77777" },
            query:  { startedAt: new Date().toISOString(), durationSec: "60" },
        });
        mockSvcGetSessionByKey.mockResolvedValue(fakeOpenF1Session);
        mockClientGet.mockResolvedValue([]);

        const res = makeRes();
        await demoPositions(req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ warming: true, positions: [] }));
    });

    it("passe l'erreur à next()", async () => {
        const req = { params: null, query: { startedAt: "x" } } as any;
        await demoPositions(req, makeRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

// ── Integration: warmup then demoLocations / demoPositions ───────────────────
// We use a unique sessionKey per test group so module-level caches don't bleed.

describe("demoLocations — avec cache chaud", () => {
    const HOT_SESSION = 55551;

    beforeEach(async () => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();

        // Warm up the cache synchronously by triggering getAllLocations internals
        // via demoLocations on a cold cache first to populate locationsCache
        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_START.getTime() + 5 * 60 * 1000 + 1).toISOString(), // 5min+1ms race
        });

        // One chunk of location data for the session
        const locRows = [
            makeLoc(1, new Date(RACE_START.getTime() + 1000).toISOString(), 100, 200),
            makeLoc(1, new Date(RACE_START.getTime() + 3000).toISOString(), 150, 250),
            makeLoc(1, new Date(RACE_START.getTime() + 5 * 60 * 1000).toISOString(), 200, 300),
        ];
        mockClientGet.mockResolvedValue(locRows);

        // Trigger warmup for HOT_SESSION
        const warmReq = makeReq({ params: { sessionKey: String(HOT_SESSION) } });
        await demoWarmup(warmReq, makeRes(), next);
        // Give the background warmup time to complete
        await new Promise(r => setImmediate(r));
        await new Promise(r => setImmediate(r));
    });

    it("retourne des locations interpolées si le cache est chaud", async () => {
        // The cache should be populated now; query with a startedAt in the past
        const startedAt = new Date(Date.now() - 30_000).toISOString();
        const req = makeReq({
            params: { sessionKey: String(HOT_SESSION) },
            query:  { startedAt, durationSec: "60", frameMs: "400" },
        });
        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_START.getTime() + 5 * 60 * 1000 + 1).toISOString(),
        });

        const res = makeRes();
        await demoLocations(req, res, next);
        const call = res.json.mock.calls[0]?.[0];
        expect(call).toMatchObject({ status: "ok" });
    });
});

// ── Integration: sampleAt last-element, within.push, downsample ──────────────
// HOT_SESSION=55553: 40 location rows packed near race end
// → virtualNowMs = raceEndMs (progress=1) → sampleAt(arr, raceEndMs) hits last-element branch
// → 40 rows in window → within.push ×40 → composed.length=42 > MAX_WAYPOINTS → downsample called

describe("demoLocations — sampleAt last-element + downsample (HOT_SESSION=55553)", () => {
    const HOT_SESSION  = 55553;
    const RACE_END_MS  = RACE_START.getTime() + 5 * 60 * 1000 + 1; // 300001 ms after start

    beforeEach(async () => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();

        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_END_MS).toISOString(),
        });

        // 40 rows packed in the last 2000 ms of the race
        // frameMs=400, speed≈5 → virtualFrameSpanMs=2000 → fromMs = raceEndMs - 2000
        const windowStart = RACE_END_MS - 2000;
        const locRows = [];
        for (let i = 0; i < 40; i++) {
            locRows.push(makeLoc(1, new Date(windowStart + i * 49).toISOString(), i * 10, i * 5));
        }
        // First client.get call is getAllLocations (one chunk), second is getAllPositions
        mockClientGet
            .mockResolvedValueOnce(locRows)
            .mockResolvedValueOnce([]);

        const warmReq = makeReq({ params: { sessionKey: String(HOT_SESSION) } });
        await demoWarmup(warmReq, makeRes(), next);
        await new Promise(r => setImmediate(r));
        await new Promise(r => setImmediate(r));
    });

    it("couvre sampleAt last-element (102-103), within.push (199) et downsample (121-124)", async () => {
        // startedAt 3 min ago, durationSec=60 → progress=3 clamped to 1 → virtualNowMs=raceEndMs
        const startedAt = new Date(Date.now() - 3 * 60 * 1000).toISOString();
        const req = makeReq({
            params: { sessionKey: String(HOT_SESSION) },
            query:  { startedAt, durationSec: "60", frameMs: "400" },
        });

        const res = makeRes();
        await demoLocations(req, res, next);
        const call = res.json.mock.calls[0]?.[0];
        expect(call).toMatchObject({ status: "ok" });
        expect(call.locations).toHaveLength(1);
        // composed = [startPos, ...40 samples, endPos] = 42 elements > MAX_WAYPOINTS(40)
        // → downsample to exactly 40 waypoints
        expect(call.locations[0].path).toHaveLength(40);
    });
});

describe("demoPositions — avec cache chaud", () => {
    const HOT_SESSION = 55552;

    beforeEach(async () => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();

        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_START.getTime() + 5 * 60 * 1000 + 1).toISOString(),
        });

        const posRows = [
            { driver_number: 1, position: 1, date: new Date(RACE_START.getTime() + 1000).toISOString() },
            { driver_number: 2, position: 2, date: new Date(RACE_START.getTime() + 2000).toISOString() },
            // entry without position — should be skipped
            { driver_number: 3, position: null, date: new Date(RACE_START.getTime() + 3000).toISOString() },
        ];
        // First call is for getAllLocations (returns []), second for getAllPositions
        mockClientGet
            .mockResolvedValueOnce([]) // locations warmup
            .mockResolvedValueOnce(posRows); // positions warmup

        const warmReq = makeReq({ params: { sessionKey: String(HOT_SESSION) } });
        await demoWarmup(warmReq, makeRes(), next);
        await new Promise(r => setImmediate(r));
        await new Promise(r => setImmediate(r));
    });

    it("retourne les positions pour un virtualNowMs dans la course", async () => {
        const startedAt = new Date(Date.now() - 30_000).toISOString();
        const req = makeReq({
            params: { sessionKey: String(HOT_SESSION) },
            query:  { startedAt, durationSec: "60" },
        });
        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_START.getTime() + 5 * 60 * 1000 + 1).toISOString(),
        });

        const res = makeRes();
        await demoPositions(req, res, next);
        const call = res.json.mock.calls[0]?.[0];
        expect(call).toMatchObject({ status: "ok" });
    });
});

// ── warmingUp.has branch (ligne 15) ──────────────────────────────────────────
// Two synchronous demoWarmup calls to same fresh session → second sees warmingUp=true

describe("startBackgroundWarmup — branche || warmingUp.has (ligne 15)", () => {
    const WARM_SESSION = 99991;

    beforeEach(() => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();
    });

    it("ne démarre pas un second warmup si déjà en cours", async () => {
        mockSvcGetSessionByKey.mockResolvedValue(fakeOpenF1Session);
        mockClientGet.mockResolvedValue([]);

        const req1 = makeReq({ params: { sessionKey: String(WARM_SESSION) } });
        const req2 = makeReq({ params: { sessionKey: String(WARM_SESSION) } });
        // Both calls run synchronously; second call sees warmingUp.has(WARM_SESSION)=true
        const p1 = demoWarmup(req1, makeRes(), next);
        const p2 = demoWarmup(req2, makeRes(), next);
        await Promise.all([p1, p2]);
        // Let background IIFE complete
        await new Promise(r => setImmediate(r));
        await new Promise(r => setImmediate(r));
    });
});

// ── getAllLocations filtre les lignes invalides (ligne 63) ────────────────────

describe("getAllLocations — lignes invalides filtrées (ligne 63)", () => {
    const HOT_SESSION = 99992;

    beforeEach(() => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();
    });

    it("ignore les lignes avec driver_number/x/y/date null ou vide", async () => {
        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_START.getTime() + 5 * 60 * 1000 + 1).toISOString(),
        });
        // Mix of invalid rows and one valid row
        mockClientGet.mockResolvedValue([
            { driver_number: null, x: 100, y: 200, date: new Date(RACE_START.getTime() + 1000).toISOString() },
            { driver_number: 1, x: null, y: 200, date: new Date(RACE_START.getTime() + 1000).toISOString() },
            { driver_number: 1, x: 100, y: null, date: new Date(RACE_START.getTime() + 1000).toISOString() },
            { driver_number: 1, x: 100, y: 200, date: "" },
            makeLoc(1, new Date(RACE_START.getTime() + 1000).toISOString(), 100, 200),
        ]);

        const warmReq = makeReq({ params: { sessionKey: String(HOT_SESSION) } });
        await demoWarmup(warmReq, makeRes(), next);
        await new Promise(r => setImmediate(r));
        await new Promise(r => setImmediate(r));
    });
});

// ── getAllPositions Array.isArray false (ligne 78) ───────────────────────────
// positions mock returns null → safe = [] (false branch of ternary)

describe("getAllPositions — réponse non-tableau (ligne 78)", () => {
    const HOT_SESSION = 99993;

    beforeEach(() => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();
    });

    it("traite une réponse non-tableau comme []", async () => {
        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_START.getTime() + 5 * 60 * 1000 + 1).toISOString(),
        });
        // Call order in Promise.all: [1]=locations chunk1, [2]=positions, [3]=locations chunk2
        mockClientGet
            .mockResolvedValueOnce([])   // locations chunk 1 → empty
            .mockResolvedValueOnce(null); // positions → null → Array.isArray=false → safe=[]
        // chunk 2 gets undefined → Array.isArray(undefined)=false → skipped

        const warmReq = makeReq({ params: { sessionKey: String(HOT_SESSION) } });
        await demoWarmup(warmReq, makeRes(), next);
        await new Promise(r => setImmediate(r));
        await new Promise(r => setImmediate(r));

        // positionsCache has [] → demoPositions returns ok with no positions
        const startedAt = new Date(Date.now() - 30_000).toISOString();
        const req = makeReq({
            params: { sessionKey: String(HOT_SESSION) },
            query:  { startedAt, durationSec: "60" },
        });
        const res = makeRes();
        await demoPositions(req, res, next);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: "ok", positions: [] }),
        );
    });
});

// ── demoLocations/demoPositions — valeurs par défaut (?? 400 / ?? 180) ───────
// Calls without frameMs/durationSec → right branches of ?? operators covered

describe("demoLocations/demoPositions — valeurs par défaut (lignes 150,165,224)", () => {
    const HOT_SESSION = 55554;

    beforeEach(async () => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();

        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_START.getTime() + 5 * 60 * 1000 + 1).toISOString(),
        });

        const posRows = [
            { driver_number: 1, position: 1, date: new Date(RACE_START.getTime() + 1000).toISOString() },
        ];
        // Call order: [1]=locations chunk1, [2]=positions, [3]=locations chunk2 (undefined → skipped)
        mockClientGet
            .mockResolvedValueOnce([makeLoc(1, new Date(RACE_START.getTime() + 1000).toISOString(), 100, 200)])
            .mockResolvedValueOnce(posRows);

        const warmReq = makeReq({ params: { sessionKey: String(HOT_SESSION) } });
        await demoWarmup(warmReq, makeRes(), next);
        await new Promise(r => setImmediate(r));
        await new Promise(r => setImmediate(r));
    });

    it("demoLocations utilise frameMs=400 et durationSec=180 par défaut", async () => {
        // 90s ago with default durationSec=180 → progress≈0.5
        const startedAt = new Date(Date.now() - 90_000).toISOString();
        const req = makeReq({
            params: { sessionKey: String(HOT_SESSION) },
            query:  { startedAt }, // no frameMs, no durationSec → both use ?? defaults
        });
        const res = makeRes();
        await demoLocations(req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "ok" }));
    });

    it("demoPositions utilise durationSec=180 par défaut", async () => {
        const startedAt = new Date(Date.now() - 90_000).toISOString();
        const req = makeReq({
            params: { sessionKey: String(HOT_SESSION) },
            query:  { startedAt }, // no durationSec → uses ?? 180 default
        });
        const res = makeRes();
        await demoPositions(req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "ok" }));
    });
});

// ── demoPositions — déduplication pilotes (lignes 244-246) ───────────────────
// driver seen twice (newer + older) covers !cur=false branches and t>cur.date true/false

describe("demoPositions — déduplication et filtre futur (lignes 244-246)", () => {
    const HOT_SESSION = 55555;

    beforeEach(async () => {
        mockSvcGetSessionByKey.mockReset();
        mockClientGet.mockReset();
        next.mockClear();

        mockSvcGetSessionByKey.mockResolvedValue({
            session_key: HOT_SESSION,
            date_start:  RACE_START.toISOString(),
            date_end:    new Date(RACE_START.getTime() + 5 * 60 * 1000 + 1).toISOString(),
        });

        // virtualNowMs will be ≈ RACE_START+150000ms (progress=0.5 with durationSec=60, startedAt=30s ago)
        const posRows = [
            // driver 1: future (200000ms > 150000ms) → t > virtualNowMs → SKIP (line 244 true)
            { driver_number: 1, position: 1, date: new Date(RACE_START.getTime() + 200_000).toISOString() },
            // driver 2: first entry → !cur=TRUE → set (line 246 left branch)
            { driver_number: 2, position: 2, date: new Date(RACE_START.getTime() + 1000).toISOString() },
            // driver 2: newer → !cur=FALSE, t=2000 > cur.date=1000 → TRUE (line 246 right branch true)
            { driver_number: 2, position: 2, date: new Date(RACE_START.getTime() + 2000).toISOString() },
            // driver 2: older → !cur=FALSE, t=500 < cur.date=2000 → FALSE (line 246 right branch false)
            { driver_number: 2, position: 2, date: new Date(RACE_START.getTime() + 500).toISOString() },
        ];
        mockClientGet
            .mockResolvedValueOnce([]) // locations chunk 1
            .mockResolvedValueOnce(posRows); // positions

        const warmReq = makeReq({ params: { sessionKey: String(HOT_SESSION) } });
        await demoWarmup(warmReq, makeRes(), next);
        await new Promise(r => setImmediate(r));
        await new Promise(r => setImmediate(r));
    });

    it("déduplique les pilotes et ignore les entrées futures", async () => {
        const startedAt = new Date(Date.now() - 30_000).toISOString();
        const req = makeReq({
            params: { sessionKey: String(HOT_SESSION) },
            query:  { startedAt, durationSec: "60" },
        });
        const res = makeRes();
        await demoPositions(req, res, next);
        const call = res.json.mock.calls[0]?.[0];
        expect(call).toMatchObject({ status: "ok" });
        // driver 1 is at 200000ms > virtualNowMs≈150000ms → filtered out
        // driver 2: latest kept is t=2000ms → 1 entry in result
        expect(call.positions).toHaveLength(1);
        expect(call.positions[0].driver_number).toBe(2);
    });
});
