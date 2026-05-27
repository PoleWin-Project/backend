import { EventEmitter } from "events";

// Mock the singleton live service before imports
const mockLiveService = new EventEmitter() as any;
mockLiveService.subscribe      = jest.fn();
mockLiveService.unsubscribe    = jest.fn();
mockLiveService.getLastPayload = jest.fn();

jest.mock("./openf1.live.service", () => ({
    openf1LiveService: mockLiveService,
}));

import { liveSession, liveRaceControl, livePositions, liveLaps, liveIntervals, liveLocation } from "./openf1.live.controller";

function makeRes() {
    return {
        setHeader:    jest.fn(),
        flushHeaders: jest.fn(),
        write:        jest.fn(),
    } as any;
}

function makeReq() {
    const emitter = new EventEmitter();
    return emitter as any;
}

beforeEach(() => {
    jest.useFakeTimers();
    mockLiveService.getLastPayload.mockReturnValue(undefined);
    mockLiveService.subscribe.mockClear();
    mockLiveService.unsubscribe.mockClear();
    // Remove all listeners added by previous tests
    mockLiveService.removeAllListeners();
});

afterEach(() => {
    jest.useRealTimers();
});

// ── Shared behaviour ──────────────────────────────────────────────────────────

describe("liveSession", () => {
    it("initialise les headers SSE", () => {
        const req = makeReq();
        const res = makeRes();
        liveSession(req, res);
        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
        expect(res.flushHeaders).toHaveBeenCalled();
    });

    it("envoie le cache immédiatement si disponible", () => {
        mockLiveService.getLastPayload.mockReturnValue({ session: { session_key: 9158 } });
        const req = makeReq();
        const res = makeRes();
        liveSession(req, res);
        expect(res.write).toHaveBeenCalledWith(expect.stringContaining("session"));
    });

    it("n'envoie pas de cache si getLastPayload retourne undefined", () => {
        mockLiveService.getLastPayload.mockReturnValue(undefined);
        const req = makeReq();
        const res = makeRes();
        liveSession(req, res);
        expect(res.write).not.toHaveBeenCalled();
    });

    it("s'abonne au stream", () => {
        const req = makeReq();
        liveSession(req, makeRes());
        expect(mockLiveService.subscribe).toHaveBeenCalledWith("session");
    });

    it("envoie un heartbeat toutes les 15s", () => {
        const req = makeReq();
        const res = makeRes();
        liveSession(req, res);
        jest.advanceTimersByTime(15_000);
        expect(res.write).toHaveBeenCalledWith(":heartbeat\n\n");
    });

    it("émet les données au client quand le service publie", () => {
        const req = makeReq();
        const res = makeRes();
        liveSession(req, res);
        mockLiveService.emit("session", { session: { session_key: 1 } });
        expect(res.write).toHaveBeenCalledWith(expect.stringContaining("data:"));
    });

    it("se désabonne et nettoie à la fermeture de la connexion", () => {
        const req = makeReq();
        const res = makeRes();
        liveSession(req, res);
        req.emit("close");
        expect(mockLiveService.unsubscribe).toHaveBeenCalledWith("session");
        // Timer should be cleared — no more heartbeats after close
        const writeCallsAfterClose = res.write.mock.calls.length;
        jest.advanceTimersByTime(30_000);
        expect(res.write.mock.calls.length).toBe(writeCallsAfterClose);
    });
});

// ── Each handler uses createSSEHandler with the correct stream/event ─────────

describe("liveRaceControl", () => {
    it("s'abonne au stream raceControl", () => {
        const req = makeReq();
        liveRaceControl(req, makeRes());
        expect(mockLiveService.subscribe).toHaveBeenCalledWith("raceControl");
    });

    it("publie les events sous l'event SSE 'race_control'", () => {
        const req = makeReq();
        const res = makeRes();
        liveRaceControl(req, res);
        mockLiveService.emit("raceControl", { events: [{ flag: "YELLOW" }] });
        expect(res.write).toHaveBeenCalledWith(expect.stringContaining("race_control"));
    });

    it("se désabonne à la fermeture", () => {
        const req = makeReq();
        liveRaceControl(req, makeRes());
        req.emit("close");
        expect(mockLiveService.unsubscribe).toHaveBeenCalledWith("raceControl");
    });
});

describe("livePositions", () => {
    it("s'abonne au stream positions", () => {
        const req = makeReq();
        livePositions(req, makeRes());
        expect(mockLiveService.subscribe).toHaveBeenCalledWith("positions");
    });

    it("publie les positions", () => {
        const req = makeReq();
        const res = makeRes();
        livePositions(req, res);
        mockLiveService.emit("positions", { positions: [{ driver_number: 1 }] });
        expect(res.write).toHaveBeenCalledWith(expect.stringContaining("positions"));
    });

    it("se désabonne à la fermeture", () => {
        const req = makeReq();
        livePositions(req, makeRes());
        req.emit("close");
        expect(mockLiveService.unsubscribe).toHaveBeenCalledWith("positions");
    });
});

describe("liveLaps", () => {
    it("s'abonne au stream laps", () => {
        const req = makeReq();
        liveLaps(req, makeRes());
        expect(mockLiveService.subscribe).toHaveBeenCalledWith("laps");
    });

    it("publie les laps", () => {
        const req = makeReq();
        const res = makeRes();
        liveLaps(req, res);
        mockLiveService.emit("laps", { laps: [{ lap_number: 1 }] });
        expect(res.write).toHaveBeenCalledWith(expect.stringContaining("laps"));
    });

    it("se désabonne à la fermeture", () => {
        const req = makeReq();
        liveLaps(req, makeRes());
        req.emit("close");
        expect(mockLiveService.unsubscribe).toHaveBeenCalledWith("laps");
    });
});

describe("liveIntervals", () => {
    it("s'abonne au stream intervals", () => {
        const req = makeReq();
        liveIntervals(req, makeRes());
        expect(mockLiveService.subscribe).toHaveBeenCalledWith("intervals");
    });

    it("publie les intervals", () => {
        const req = makeReq();
        const res = makeRes();
        liveIntervals(req, res);
        mockLiveService.emit("intervals", { intervals: [{ driver_number: 1 }] });
        expect(res.write).toHaveBeenCalledWith(expect.stringContaining("intervals"));
    });

    it("se désabonne à la fermeture", () => {
        const req = makeReq();
        liveIntervals(req, makeRes());
        req.emit("close");
        expect(mockLiveService.unsubscribe).toHaveBeenCalledWith("intervals");
    });
});

describe("liveLocation", () => {
    it("s'abonne au stream locations", () => {
        const req = makeReq();
        liveLocation(req, makeRes());
        expect(mockLiveService.subscribe).toHaveBeenCalledWith("locations");
    });

    it("publie les locations", () => {
        const req = makeReq();
        const res = makeRes();
        liveLocation(req, res);
        mockLiveService.emit("locations", { locations: [{ driver_number: 1 }] });
        expect(res.write).toHaveBeenCalledWith(expect.stringContaining("locations"));
    });

    it("se désabonne à la fermeture", () => {
        const req = makeReq();
        liveLocation(req, makeRes());
        req.emit("close");
        expect(mockLiveService.unsubscribe).toHaveBeenCalledWith("locations");
    });
});
