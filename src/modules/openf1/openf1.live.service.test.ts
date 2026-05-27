// Mock the openf1Client before any imports
const mockGet = jest.fn();

jest.mock("../../common/clients/openf1.client", () => ({
    openf1Client: { get: mockGet },
}));

import { OpenF1LiveService } from "./openf1.live.service";

describe("OpenF1LiveService", () => {
    let svc: OpenF1LiveService;

    beforeEach(() => {
        jest.useFakeTimers();
        svc = new OpenF1LiveService();
        mockGet.mockReset();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // ── subscribe / unsubscribe / refcount ─────────────────────────────────────

    it("subscribe démarre le poller à count=1", () => {
        mockGet.mockResolvedValue([]);
        svc.subscribe("session");
        expect(mockGet).toHaveBeenCalledTimes(1); // immediate poll on start
    });

    it("subscribe ne démarre pas un second poller si déjà abonné", () => {
        mockGet.mockResolvedValue([]);
        svc.subscribe("session");
        svc.subscribe("session");
        // Still only one setInterval running, mockGet called once at start
        expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("unsubscribe arrête le poller quand count atteint 0", () => {
        mockGet.mockResolvedValue([]);
        svc.subscribe("session");
        svc.unsubscribe("session");
        const callsAfterUnsub = mockGet.mock.calls.length;
        // Advance time — poller should be stopped
        jest.advanceTimersByTime(60_000);
        expect(mockGet).toHaveBeenCalledTimes(callsAfterUnsub);
    });

    it("unsubscribe ne stoppe pas le poller si count reste > 0 (branche false ligne 57)", () => {
        mockGet.mockResolvedValue([]);
        svc.subscribe("session");  // count = 1, poller starts
        svc.subscribe("session");  // count = 2
        svc.unsubscribe("session"); // count = 1 → stopPoller NOT called
        const callsBefore = mockGet.mock.calls.length;
        jest.advanceTimersByTime(60_000); // poller still running
        expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it("unsubscribe ne crash pas si count est déjà 0", () => {
        expect(() => svc.unsubscribe("session")).not.toThrow();
    });

    it("getLastPayload retourne undefined si pas encore de données", () => {
        expect(svc.getLastPayload("session")).toBeUndefined();
    });

    // ── pollSession ────────────────────────────────────────────────────────────

    it("pollSession publie la session et émet l'événement", async () => {
        const fakeSession = { session_key: 9158 };
        mockGet.mockResolvedValue([fakeSession]);

        const handler = jest.fn();
        svc.on("session", handler);
        svc.subscribe("session");
        await Promise.resolve(); // let poll microtask settle

        expect(handler).toHaveBeenCalledWith({ session: fakeSession });
        expect(svc.getLastPayload("session")).toEqual({ session: fakeSession });
    });

    it("pollSession publie session=null si tableau vide", async () => {
        mockGet.mockResolvedValue([]);
        const handler = jest.fn();
        svc.on("session", handler);
        svc.subscribe("session");
        await Promise.resolve();
        expect(handler).toHaveBeenCalledWith({ session: null });
    });

    it("pollSession ignore les erreurs réseau", async () => {
        mockGet.mockRejectedValue(new Error("network"));
        const handler = jest.fn();
        svc.on("session", handler);
        svc.subscribe("session");
        await Promise.resolve();
        expect(handler).not.toHaveBeenCalled();
    });

    // ── pollRaceControl ────────────────────────────────────────────────────────

    it("pollRaceControl publie les événements (premier appel sans date)", async () => {
        const event = { date: "2024-09-01T13:05:00", flag: "YELLOW" };
        mockGet.mockResolvedValue([event]);

        const handler = jest.fn();
        svc.on("raceControl", handler);
        svc.subscribe("raceControl");
        await Promise.resolve();

        expect(handler).toHaveBeenCalledWith({ events: [event] });
    });

    it("pollRaceControl filtre les anciens événements lors des appels suivants", async () => {
        const old   = { date: "2024-09-01T13:00:00", flag: "GREEN" };
        const fresh = { date: "2024-09-01T14:00:00", flag: "RED" };

        // First poll
        mockGet.mockResolvedValueOnce([old]);
        const handler = jest.fn();
        svc.on("raceControl", handler);
        svc.subscribe("raceControl");
        await Promise.resolve();

        // Second poll — includes both, but only fresh is newer than lastDate
        mockGet.mockResolvedValueOnce([old, fresh]);
        jest.advanceTimersByTime(5_000);
        await Promise.resolve();

        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler.mock.calls[1][0]).toEqual({ events: [fresh] });
    });

    it("pollRaceControl n'émet rien si pas de nouveaux événements", async () => {
        const event = { date: "2024-09-01T13:00:00", flag: "GREEN" };
        mockGet.mockResolvedValue([event]);

        const handler = jest.fn();
        svc.on("raceControl", handler);
        svc.subscribe("raceControl");
        await Promise.resolve();
        handler.mockClear();

        // Second poll — same event, nothing newer
        mockGet.mockResolvedValue([event]);
        jest.advanceTimersByTime(5_000);
        await Promise.resolve();
        expect(handler).not.toHaveBeenCalled();
    });

    it("pollRaceControl ignore les erreurs", async () => {
        mockGet.mockRejectedValue(new Error("fail"));
        expect(() => svc.subscribe("raceControl")).not.toThrow();
        await Promise.resolve();
    });

    // ── pollPositions ──────────────────────────────────────────────────────────

    it("pollPositions publie les positions dédupliquées et triées", async () => {
        const pos1 = { driver_number: 1, position: 1, date: "2024-09-01T13:00:00" };
        const pos2 = { driver_number: 2, position: 2, date: "2024-09-01T13:00:00" };
        mockGet.mockResolvedValue([pos2, pos1]);

        const handler = jest.fn();
        svc.on("positions", handler);
        svc.subscribe("positions");
        await Promise.resolve();

        const published = handler.mock.calls[0][0];
        expect(published.positions[0].driver_number).toBe(1);
        expect(published.positions[1].driver_number).toBe(2);
    });

    it("pollPositions n'émet rien si tableau vide", async () => {
        mockGet.mockResolvedValue([]);
        const handler = jest.fn();
        svc.on("positions", handler);
        svc.subscribe("positions");
        await Promise.resolve();
        expect(handler).not.toHaveBeenCalled();
    });

    it("pollPositions filtre par date lors des appels suivants", async () => {
        const pos = { driver_number: 1, position: 1, date: "2024-09-01T13:00:00" };
        mockGet.mockResolvedValue([pos]);

        svc.subscribe("positions");
        await Promise.resolve();

        // Second poll with filter
        mockGet.mockResolvedValue([pos]);
        jest.advanceTimersByTime(5_000);
        await Promise.resolve();
        // Should have called with filter after first poll
        expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it("pollPositions ignore les erreurs", async () => {
        mockGet.mockRejectedValue(new Error("fail"));
        expect(() => svc.subscribe("positions")).not.toThrow();
        await Promise.resolve();
    });

    // ── pollLaps ───────────────────────────────────────────────────────────────

    it("pollLaps publie les nouveaux tours", async () => {
        const lap = { date_start: "2024-09-01T13:00:00", driver_number: 16, lap_number: 1 };
        mockGet.mockResolvedValue([lap]);

        const handler = jest.fn();
        svc.on("laps", handler);
        svc.subscribe("laps");
        await Promise.resolve();
        expect(handler).toHaveBeenCalledWith({ laps: [lap] });
    });

    it("pollLaps n'émet rien si pas de nouveaux tours", async () => {
        const lap = { date_start: "2024-09-01T13:00:00", driver_number: 16, lap_number: 1 };
        mockGet.mockResolvedValue([lap]);

        const handler = jest.fn();
        svc.on("laps", handler);
        svc.subscribe("laps");
        await Promise.resolve();
        handler.mockClear();

        // Second poll — same lap, nothing newer
        mockGet.mockResolvedValue([lap]);
        jest.advanceTimersByTime(10_000);
        await Promise.resolve();
        expect(handler).not.toHaveBeenCalled();
    });

    it("pollLaps ignore les erreurs", async () => {
        mockGet.mockRejectedValue(new Error("fail"));
        expect(() => svc.subscribe("laps")).not.toThrow();
        await Promise.resolve();
    });

    // ── pollIntervals ──────────────────────────────────────────────────────────

    it("pollIntervals publie les intervalles dédupliqués", async () => {
        const int1 = { driver_number: 1, gap_to_leader: 0,    date: "2024-09-01T13:00:00" };
        const int2 = { driver_number: 2, gap_to_leader: 1.5,  date: "2024-09-01T13:00:00" };
        mockGet.mockResolvedValue([int2, int1]);

        const handler = jest.fn();
        svc.on("intervals", handler);
        svc.subscribe("intervals");
        await Promise.resolve();

        const published = handler.mock.calls[0][0];
        expect(published.intervals[0].driver_number).toBe(1);
    });

    it("pollIntervals n'émet rien si tableau vide", async () => {
        mockGet.mockResolvedValue([]);
        const handler = jest.fn();
        svc.on("intervals", handler);
        svc.subscribe("intervals");
        await Promise.resolve();
        expect(handler).not.toHaveBeenCalled();
    });

    it("pollIntervals ignore les erreurs", async () => {
        mockGet.mockRejectedValue(new Error("fail"));
        expect(() => svc.subscribe("intervals")).not.toThrow();
        await Promise.resolve();
    });

    it("pollIntervals utilise le filtre de date lors des appels suivants (branche true ligne 160)", async () => {
        const int1 = { driver_number: 1, gap_to_leader: 0.5, date: "2024-09-01T13:00:00" };
        mockGet.mockResolvedValue([int1]);

        svc.subscribe("intervals");
        await Promise.resolve(); // first poll — sets lastIntervalDate

        mockGet.mockResolvedValue([int1]);
        jest.advanceTimersByTime(10_000); // triggers second poll with filter
        await Promise.resolve();

        // Second call should have been made with a date filter
        expect(mockGet).toHaveBeenCalledTimes(2);
        const secondCallFilters = mockGet.mock.calls[1][2];
        expect(secondCallFilters).toEqual([`date>${int1.date}`]);
    });

    it("pollIntervals gère gap_to_leader null dans le tri (branche ?? 0 ligne 173)", async () => {
        // 3 drivers: null in the middle ensures BOTH comparisons cover a.?? 0 AND b.?? 0
        const intNull = { driver_number: 2, gap_to_leader: null, date: "2024-09-01T13:00:00" };
        const int1    = { driver_number: 1, gap_to_leader: 0.5,  date: "2024-09-01T13:00:00" };
        const int3    = { driver_number: 3, gap_to_leader: 2.0,  date: "2024-09-01T13:00:00" };
        // Sort compares (int3, intNull): a.gap=2.0 (LEFT ??), b.gap=null (RIGHT ??)
        // Sort compares (intNull, int1): a.gap=null (RIGHT ??), b.gap=0.5 (LEFT ??)
        mockGet.mockResolvedValue([int3, intNull, int1]);

        const handler = jest.fn();
        svc.on("intervals", handler);
        svc.subscribe("intervals");
        await Promise.resolve();

        const published = handler.mock.calls[0][0];
        // null ?? 0 = 0, so driver 2 (0) sorts before driver 1 (0.5) and driver 3 (2.0)
        expect(published.intervals[0].driver_number).toBe(2);
        expect(published.intervals[1].driver_number).toBe(1);
        expect(published.intervals[2].driver_number).toBe(3);
    });

    // ── pollLocation ───────────────────────────────────────────────────────────

    it("pollLocation publie les localisations", async () => {
        const loc = { driver_number: 1, x: 100, y: 200, date: "2024-09-01T13:00:00" };
        mockGet.mockResolvedValue([loc]);

        const handler = jest.fn();
        svc.on("locations", handler);
        svc.subscribe("locations");
        await Promise.resolve();
        expect(handler).toHaveBeenCalledWith({ locations: [loc] });
    });

    it("pollLocation n'émet rien si tableau vide", async () => {
        mockGet.mockResolvedValue([]);
        const handler = jest.fn();
        svc.on("locations", handler);
        svc.subscribe("locations");
        await Promise.resolve();
        expect(handler).not.toHaveBeenCalled();
    });

    it("pollLocation filtre par date lors des appels suivants", async () => {
        const loc = { driver_number: 1, x: 100, y: 200, date: "2024-09-01T13:00:00" };
        mockGet.mockResolvedValue([loc]);

        svc.subscribe("locations");
        await Promise.resolve();

        mockGet.mockResolvedValue([loc]);
        jest.advanceTimersByTime(1_000);
        await Promise.resolve();
        expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it("pollLocation ignore les erreurs", async () => {
        mockGet.mockRejectedValue(new Error("fail"));
        expect(() => svc.subscribe("locations")).not.toThrow();
        await Promise.resolve();
    });

    // ── stopPoller when timer missing ──────────────────────────────────────────

    it("stopPoller ne crash pas si pas de timer (double unsubscribe)", () => {
        mockGet.mockResolvedValue([]);
        svc.subscribe("session");
        svc.unsubscribe("session"); // stops poller
        expect(() => svc.unsubscribe("session")).not.toThrow(); // count goes below 0 → still 0
    });
});
