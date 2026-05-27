const mockSvc = {
    getMeetings:          jest.fn(),
    getLatestMeeting:     jest.fn(),
    getSessions:          jest.fn(),
    getLatestSession:     jest.fn(),
    getSessionByKey:      jest.fn(),
    getDrivers:           jest.fn(),
    getRaceControl:       jest.fn(),
    getCalendar:          jest.fn(),
    getUpcomingSessions:  jest.fn(),
    getNextSession:       jest.fn(),
    getWeather:           jest.fn(),
    getPitStops:          jest.fn(),
    getStints:            jest.fn(),
    getTeamRadio:         jest.fn(),
    getLocations:         jest.fn(),
    getLatestPositions:   jest.fn(),
    getSessionResults:    jest.fn(),
    getDriverStandings:   jest.fn(),
    getTeamStandings:     jest.fn(),
    listDrivers:          jest.fn(),
    getDriverByNumber:    jest.fn(),
    getTeamsForSession:   jest.fn(),
    listTeams:            jest.fn(),
    getPitStopsByDriver:  jest.fn(),
    getStintsByDriver:    jest.fn(),
    getTeamRadioByDriver: jest.fn(),
    getPitStopsByTeam:    jest.fn(),
    getStintsByTeam:      jest.fn(),
    getTeamRadioByTeam:   jest.fn(),
};

const mockRaceSessionsRepo = {
    findByExternalId: jest.fn(),
    create:           jest.fn(),
};

const mockChatChannelsService = {
    ensureLiveChannelForSession: jest.fn(),
};

jest.mock("./openf1.service", () => ({
    OpenF1Service: jest.fn().mockImplementation(() => mockSvc),
}));

jest.mock("../raceSessions/raceSessions.repository", () => ({
    RaceSessionsRepository: jest.fn().mockImplementation(() => mockRaceSessionsRepo),
}));

jest.mock("../chatChannels/chatChannels.service", () => ({
    ChatChannelsService: jest.fn().mockImplementation(() => mockChatChannelsService),
}));

import { OpenF1Controller } from "./openf1.controller";

function makeReq(overrides: object = {}) {
    return { params: {}, body: {}, query: {}, ...overrides } as any;
}

function makeRes() {
    const json   = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as any;
}

const next = jest.fn();

describe("OpenF1Controller", () => {
    let ctrl: OpenF1Controller;

    beforeEach(() => {
        ctrl = new OpenF1Controller();
        next.mockClear();
    });

    // ── getMeetings ────────────────────────────────────────────────────────────

    it("getMeetings — retourne les meetings", async () => {
        mockSvc.getMeetings.mockResolvedValue([{ meeting_key: 1 }]);
        const req = makeReq({ query: { year: "2024", country_code: "IT" } });
        const res = makeRes();
        await ctrl.getMeetings(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", meetings: [{ meeting_key: 1 }] });
    });

    it("getMeetings — sans query params", async () => {
        mockSvc.getMeetings.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getMeetings(makeReq(), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", meetings: [] });
    });

    it("getMeetings — passe l'erreur à next()", async () => {
        const err = new Error("fail");
        mockSvc.getMeetings.mockRejectedValue(err);
        await ctrl.getMeetings(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalledWith(err);
    });

    // ── getLatestMeeting ───────────────────────────────────────────────────────

    it("getLatestMeeting — retourne le meeting", async () => {
        mockSvc.getLatestMeeting.mockResolvedValue({ meeting_key: 1 });
        const res = makeRes();
        await ctrl.getLatestMeeting(makeReq(), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", meeting: { meeting_key: 1 } });
    });

    it("getLatestMeeting — passe l'erreur à next()", async () => {
        mockSvc.getLatestMeeting.mockRejectedValue(new Error("fail"));
        await ctrl.getLatestMeeting(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getSessions ────────────────────────────────────────────────────────────

    it("getSessions — retourne les sessions", async () => {
        mockSvc.getSessions.mockResolvedValue([{ session_key: 9158 }]);
        const req = makeReq({ query: { meeting_key: "1217", session_type: "Race", year: "2024" } });
        const res = makeRes();
        await ctrl.getSessions(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", sessions: [{ session_key: 9158 }] });
    });

    it("getSessions — sans query params", async () => {
        mockSvc.getSessions.mockResolvedValue([]);
        await ctrl.getSessions(makeReq(), makeRes(), next);
        expect(mockSvc.getSessions).toHaveBeenCalledWith({ meeting_key: undefined, session_type: undefined, year: undefined });
    });

    it("getSessions — passe l'erreur à next()", async () => {
        mockSvc.getSessions.mockRejectedValue(new Error("fail"));
        await ctrl.getSessions(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getLatestSession ───────────────────────────────────────────────────────

    it("getLatestSession — retourne la session", async () => {
        mockSvc.getLatestSession.mockResolvedValue({ session_key: 9158 });
        const res = makeRes();
        await ctrl.getLatestSession(makeReq(), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", session: { session_key: 9158 } });
    });

    it("getLatestSession — passe l'erreur à next()", async () => {
        mockSvc.getLatestSession.mockRejectedValue(new Error("fail"));
        await ctrl.getLatestSession(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getSession ─────────────────────────────────────────────────────────────

    it("getSession — retourne la session quand sessionKey=latest", async () => {
        mockSvc.getLatestSession.mockResolvedValue({ session_key: 9158 });
        const req = makeReq({ params: { sessionKey: "latest" } });
        const res = makeRes();
        await ctrl.getSession(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", session: { session_key: 9158 } });
    });

    it("getSession — retourne la session par clé", async () => {
        mockSvc.getSessionByKey.mockResolvedValue({ session_key: 9158 });
        const req = makeReq({ params: { sessionKey: "9158" } });
        const res = makeRes();
        await ctrl.getSession(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", session: { session_key: 9158 } });
    });

    it("getSession — retourne 404 si session non trouvée", async () => {
        mockSvc.getSessionByKey.mockResolvedValue(null);
        const req = makeReq({ params: { sessionKey: "9999" } });
        const res = makeRes();
        await ctrl.getSession(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("getSession — passe l'erreur à next()", async () => {
        mockSvc.getSessionByKey.mockRejectedValue(new Error("fail"));
        const req = makeReq({ params: { sessionKey: "9158" } });
        await ctrl.getSession(req, makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getDrivers ─────────────────────────────────────────────────────────────

    it("getDrivers — sessionKey=latest", async () => {
        mockSvc.getDrivers.mockResolvedValue([]);
        const req = makeReq({ params: { sessionKey: "latest" } });
        await ctrl.getDrivers(req, makeRes(), next);
        expect(mockSvc.getDrivers).toHaveBeenCalledWith("latest");
    });

    it("getDrivers — sessionKey numérique", async () => {
        mockSvc.getDrivers.mockResolvedValue([{ driver_number: 16 }]);
        const req = makeReq({ params: { sessionKey: "9158" } });
        const res = makeRes();
        await ctrl.getDrivers(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", drivers: [{ driver_number: 16 }] });
    });

    it("getDrivers — passe l'erreur à next()", async () => {
        mockSvc.getDrivers.mockRejectedValue(new Error("fail"));
        const req = makeReq({ params: { sessionKey: "9158" } });
        await ctrl.getDrivers(req, makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getRaceControl ─────────────────────────────────────────────────────────

    it("getRaceControl — retourne les events", async () => {
        mockSvc.getRaceControl.mockResolvedValue([{ flag: "GREEN" }]);
        const req = makeReq({ params: { sessionKey: "9158" } });
        const res = makeRes();
        await ctrl.getRaceControl(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", events: [{ flag: "GREEN" }] });
    });

    it("getRaceControl — passe l'erreur à next()", async () => {
        mockSvc.getRaceControl.mockRejectedValue(new Error("fail"));
        await ctrl.getRaceControl(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getCalendar ────────────────────────────────────────────────────────────

    it("getCalendar — avec year", async () => {
        mockSvc.getCalendar.mockResolvedValue([]);
        await ctrl.getCalendar(makeReq({ query: { year: "2024" } }), makeRes(), next);
        expect(mockSvc.getCalendar).toHaveBeenCalledWith(2024);
    });

    it("getCalendar — sans year", async () => {
        mockSvc.getCalendar.mockResolvedValue([]);
        await ctrl.getCalendar(makeReq(), makeRes(), next);
        expect(mockSvc.getCalendar).toHaveBeenCalledWith(undefined);
    });

    it("getCalendar — passe l'erreur à next()", async () => {
        mockSvc.getCalendar.mockRejectedValue(new Error("fail"));
        await ctrl.getCalendar(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getUpcomingSessions ────────────────────────────────────────────────────

    it("getUpcomingSessions — avec limit", async () => {
        mockSvc.getUpcomingSessions.mockResolvedValue([]);
        await ctrl.getUpcomingSessions(makeReq({ query: { limit: "5" } }), makeRes(), next);
        expect(mockSvc.getUpcomingSessions).toHaveBeenCalledWith(5);
    });

    it("getUpcomingSessions — limit par défaut 10", async () => {
        mockSvc.getUpcomingSessions.mockResolvedValue([]);
        await ctrl.getUpcomingSessions(makeReq(), makeRes(), next);
        expect(mockSvc.getUpcomingSessions).toHaveBeenCalledWith(10);
    });

    it("getUpcomingSessions — passe l'erreur à next()", async () => {
        mockSvc.getUpcomingSessions.mockRejectedValue(new Error("fail"));
        await ctrl.getUpcomingSessions(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getNextSession ─────────────────────────────────────────────────────────

    it("getNextSession — retourne la prochaine session", async () => {
        mockSvc.getNextSession.mockResolvedValue({ session_key: 9158 });
        const res = makeRes();
        await ctrl.getNextSession(makeReq(), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", session: { session_key: 9158 } });
    });

    it("getNextSession — passe l'erreur à next()", async () => {
        mockSvc.getNextSession.mockRejectedValue(new Error("fail"));
        await ctrl.getNextSession(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getWeather / getPitStops / getStints / getTeamRadio ────────────────────

    it("getWeather — retourne la météo", async () => {
        mockSvc.getWeather.mockResolvedValue([]);
        await ctrl.getWeather(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(mockSvc.getWeather).toHaveBeenCalledWith(9158);
    });

    it("getWeather — passe l'erreur à next()", async () => {
        mockSvc.getWeather.mockRejectedValue(new Error("fail"));
        await ctrl.getWeather(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getPitStops — délègue et retourne", async () => {
        mockSvc.getPitStops.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getPitStops(makeReq({ params: { sessionKey: "9158" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", pit: [] });
    });

    it("getPitStops — passe l'erreur à next()", async () => {
        mockSvc.getPitStops.mockRejectedValue(new Error("fail"));
        await ctrl.getPitStops(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getStints — délègue et retourne", async () => {
        mockSvc.getStints.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getStints(makeReq({ params: { sessionKey: "9158" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", stints: [] });
    });

    it("getStints — passe l'erreur à next()", async () => {
        mockSvc.getStints.mockRejectedValue(new Error("fail"));
        await ctrl.getStints(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getTeamRadio — délègue et retourne", async () => {
        mockSvc.getTeamRadio.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getTeamRadio(makeReq({ params: { sessionKey: "9158" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", radio: [] });
    });

    it("getTeamRadio — passe l'erreur à next()", async () => {
        mockSvc.getTeamRadio.mockRejectedValue(new Error("fail"));
        await ctrl.getTeamRadio(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getLatestLocations / getLatestPositions ─────────────────────────────────

    it("getLatestLocations — sessionKey=latest", async () => {
        mockSvc.getLocations.mockResolvedValue([]);
        await ctrl.getLatestLocations(makeReq({ params: { sessionKey: "latest" } }), makeRes(), next);
        expect(mockSvc.getLocations).toHaveBeenCalledWith("latest");
    });

    it("getLatestLocations — sessionKey numérique", async () => {
        mockSvc.getLocations.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getLatestLocations(makeReq({ params: { sessionKey: "9158" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", locations: [] });
    });

    it("getLatestLocations — passe l'erreur à next()", async () => {
        mockSvc.getLocations.mockRejectedValue(new Error("fail"));
        await ctrl.getLatestLocations(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getLatestPositions — sessionKey=latest", async () => {
        mockSvc.getLatestPositions.mockResolvedValue([]);
        await ctrl.getLatestPositions(makeReq({ params: { sessionKey: "latest" } }), makeRes(), next);
        expect(mockSvc.getLatestPositions).toHaveBeenCalledWith("latest");
    });

    it("getLatestPositions — sessionKey numérique", async () => {
        mockSvc.getLatestPositions.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getLatestPositions(makeReq({ params: { sessionKey: "9158" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", positions: [] });
    });

    it("getLatestPositions — passe l'erreur à next()", async () => {
        mockSvc.getLatestPositions.mockRejectedValue(new Error("fail"));
        await ctrl.getLatestPositions(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getSessionResults ──────────────────────────────────────────────────────

    it("getSessionResults — retourne les résultats", async () => {
        mockSvc.getSessionResults.mockResolvedValue([{ position: 1 }]);
        const res = makeRes();
        await ctrl.getSessionResults(makeReq({ params: { sessionKey: "9158" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", results: [{ position: 1 }] });
    });

    it("getSessionResults — passe l'erreur à next()", async () => {
        mockSvc.getSessionResults.mockRejectedValue(new Error("fail"));
        await ctrl.getSessionResults(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getDriverStandings / getTeamStandings ──────────────────────────────────

    it("getDriverStandings — avec year", async () => {
        mockSvc.getDriverStandings.mockResolvedValue([]);
        await ctrl.getDriverStandings(makeReq({ query: { year: "2024" } }), makeRes(), next);
        expect(mockSvc.getDriverStandings).toHaveBeenCalledWith(2024);
    });

    it("getDriverStandings — sans year", async () => {
        mockSvc.getDriverStandings.mockResolvedValue([]);
        await ctrl.getDriverStandings(makeReq(), makeRes(), next);
        expect(mockSvc.getDriverStandings).toHaveBeenCalledWith(undefined);
    });

    it("getDriverStandings — passe l'erreur à next()", async () => {
        mockSvc.getDriverStandings.mockRejectedValue(new Error("fail"));
        await ctrl.getDriverStandings(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getTeamStandings — avec year", async () => {
        mockSvc.getTeamStandings.mockResolvedValue([]);
        await ctrl.getTeamStandings(makeReq({ query: { year: "2024" } }), makeRes(), next);
        expect(mockSvc.getTeamStandings).toHaveBeenCalledWith(2024);
    });

    it("getTeamStandings — sans year", async () => {
        mockSvc.getTeamStandings.mockResolvedValue([]);
        await ctrl.getTeamStandings(makeReq(), makeRes(), next);
        expect(mockSvc.getTeamStandings).toHaveBeenCalledWith(undefined);
    });

    it("getTeamStandings — passe l'erreur à next()", async () => {
        mockSvc.getTeamStandings.mockRejectedValue(new Error("fail"));
        await ctrl.getTeamStandings(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── listDrivers / getDriverByNumber ────────────────────────────────────────

    it("listDrivers — avec params", async () => {
        mockSvc.listDrivers.mockResolvedValue([]);
        const req = makeReq({ query: { session_key: "9158", name_acronym: "LEC" } });
        await ctrl.listDrivers(req, makeRes(), next);
        expect(mockSvc.listDrivers).toHaveBeenCalledWith({ session_key: 9158, name_acronym: "LEC" });
    });

    it("listDrivers — sans params", async () => {
        mockSvc.listDrivers.mockResolvedValue([]);
        await ctrl.listDrivers(makeReq(), makeRes(), next);
        expect(mockSvc.listDrivers).toHaveBeenCalledWith({ session_key: undefined, name_acronym: undefined });
    });

    it("listDrivers — passe l'erreur à next()", async () => {
        mockSvc.listDrivers.mockRejectedValue(new Error("fail"));
        await ctrl.listDrivers(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getDriverByNumber — driver trouvé", async () => {
        mockSvc.getDriverByNumber.mockResolvedValue({ driver_number: 16 });
        const req = makeReq({ params: { driverNumber: "16" }, query: { session_key: "9158" } });
        const res = makeRes();
        await ctrl.getDriverByNumber(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", driver: { driver_number: 16 } });
    });

    it("getDriverByNumber — driver non trouvé → 404", async () => {
        mockSvc.getDriverByNumber.mockResolvedValue(null);
        const req = makeReq({ params: { driverNumber: "99" }, query: {} });
        const res = makeRes();
        await ctrl.getDriverByNumber(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("getDriverByNumber — passe l'erreur à next()", async () => {
        mockSvc.getDriverByNumber.mockRejectedValue(new Error("fail"));
        await ctrl.getDriverByNumber(makeReq({ params: { driverNumber: "16" }, query: {} }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getSessionTeams / listTeams ────────────────────────────────────────────

    it("getSessionTeams — sessionKey=latest", async () => {
        mockSvc.getTeamsForSession.mockResolvedValue([]);
        await ctrl.getSessionTeams(makeReq({ params: { sessionKey: "latest" } }), makeRes(), next);
        expect(mockSvc.getTeamsForSession).toHaveBeenCalledWith("latest");
    });

    it("getSessionTeams — sessionKey numérique", async () => {
        mockSvc.getTeamsForSession.mockResolvedValue([{ team_name: "Ferrari" }]);
        const res = makeRes();
        await ctrl.getSessionTeams(makeReq({ params: { sessionKey: "9158" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", teams: [{ team_name: "Ferrari" }] });
    });

    it("getSessionTeams — passe l'erreur à next()", async () => {
        mockSvc.getTeamsForSession.mockRejectedValue(new Error("fail"));
        await ctrl.getSessionTeams(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("listTeams — avec session_key", async () => {
        mockSvc.listTeams.mockResolvedValue([]);
        await ctrl.listTeams(makeReq({ query: { session_key: "9158" } }), makeRes(), next);
        expect(mockSvc.listTeams).toHaveBeenCalledWith(9158);
    });

    it("listTeams — sans session_key", async () => {
        mockSvc.listTeams.mockResolvedValue([]);
        await ctrl.listTeams(makeReq(), makeRes(), next);
        expect(mockSvc.listTeams).toHaveBeenCalledWith(undefined);
    });

    it("listTeams — passe l'erreur à next()", async () => {
        mockSvc.listTeams.mockRejectedValue(new Error("fail"));
        await ctrl.listTeams(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── By-driver sub-routes ───────────────────────────────────────────────────

    it("getDriverPit — retourne les pit-stops", async () => {
        mockSvc.getPitStopsByDriver.mockResolvedValue([]);
        const req = makeReq({ params: { sessionKey: "9158", driverNumber: "16" } });
        const res = makeRes();
        await ctrl.getDriverPit(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", pit: [] });
    });

    it("getDriverPit — passe l'erreur à next()", async () => {
        mockSvc.getPitStopsByDriver.mockRejectedValue(new Error("fail"));
        await ctrl.getDriverPit(makeReq({ params: { sessionKey: "9158", driverNumber: "16" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getDriverStints — retourne les stints", async () => {
        mockSvc.getStintsByDriver.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getDriverStints(makeReq({ params: { sessionKey: "9158", driverNumber: "16" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", stints: [] });
    });

    it("getDriverStints — passe l'erreur à next()", async () => {
        mockSvc.getStintsByDriver.mockRejectedValue(new Error("fail"));
        await ctrl.getDriverStints(makeReq({ params: { sessionKey: "9158", driverNumber: "16" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getDriverTeamRadio — retourne la radio", async () => {
        mockSvc.getTeamRadioByDriver.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getDriverTeamRadio(makeReq({ params: { sessionKey: "9158", driverNumber: "16" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", radio: [] });
    });

    it("getDriverTeamRadio — passe l'erreur à next()", async () => {
        mockSvc.getTeamRadioByDriver.mockRejectedValue(new Error("fail"));
        await ctrl.getDriverTeamRadio(makeReq({ params: { sessionKey: "9158", driverNumber: "16" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── getSessionChatChannel ──────────────────────────────────────────────────

    it("getSessionChatChannel — utilise un raceSession existant", async () => {
        const fakeSession = { id: 1, name: "Race" };
        const fakeChannel = { id: 10, name: "live-1" };
        mockRaceSessionsRepo.findByExternalId.mockResolvedValue(fakeSession);
        mockChatChannelsService.ensureLiveChannelForSession.mockResolvedValue(fakeChannel);
        const req = makeReq({ params: { sessionKey: "9158" } });
        const res = makeRes();
        await ctrl.getSessionChatChannel(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", channel: fakeChannel });
    });

    it("getSessionChatChannel — crée le raceSession si inexistant", async () => {
        const fakeOpenF1Session = {
            session_key: 9158, session_name: "Race",
            date_start: "2024-09-01T13:00:00+00:00",
        };
        const createdSession = { id: 2, name: "Race" };
        const fakeChannel = { id: 11 };
        mockRaceSessionsRepo.findByExternalId.mockResolvedValue(null);
        mockSvc.getSessionByKey.mockResolvedValue(fakeOpenF1Session);
        mockRaceSessionsRepo.create.mockResolvedValue(createdSession);
        mockChatChannelsService.ensureLiveChannelForSession.mockResolvedValue(fakeChannel);
        const req = makeReq({ params: { sessionKey: "9158" } });
        const res = makeRes();
        await ctrl.getSessionChatChannel(req, res, next);
        expect(mockRaceSessionsRepo.create).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ status: "ok", channel: fakeChannel });
    });

    it("getSessionChatChannel — 404 si session OpenF1 introuvable", async () => {
        mockRaceSessionsRepo.findByExternalId.mockResolvedValue(null);
        mockSvc.getSessionByKey.mockResolvedValue(null);
        const req = makeReq({ params: { sessionKey: "9999" } });
        const res = makeRes();
        await ctrl.getSessionChatChannel(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("getSessionChatChannel — crée sans date_start si null", async () => {
        const fakeOpenF1Session = { session_key: 9158, session_name: "Race", date_start: null };
        const createdSession = { id: 3, name: "Race" };
        mockRaceSessionsRepo.findByExternalId.mockResolvedValue(null);
        mockSvc.getSessionByKey.mockResolvedValue(fakeOpenF1Session);
        mockRaceSessionsRepo.create.mockResolvedValue(createdSession);
        mockChatChannelsService.ensureLiveChannelForSession.mockResolvedValue({ id: 12 });
        await ctrl.getSessionChatChannel(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(mockRaceSessionsRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ dateStart: null }),
        );
    });

    it("getSessionChatChannel — passe l'erreur à next()", async () => {
        mockRaceSessionsRepo.findByExternalId.mockRejectedValue(new Error("db fail"));
        await ctrl.getSessionChatChannel(makeReq({ params: { sessionKey: "9158" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    // ── By-team sub-routes ─────────────────────────────────────────────────────

    it("getTeamPit — retourne les pit-stops", async () => {
        mockSvc.getPitStopsByTeam.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getTeamPit(makeReq({ params: { sessionKey: "9158", teamName: "Ferrari" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", pit: [] });
    });

    it("getTeamPit — passe l'erreur à next()", async () => {
        mockSvc.getPitStopsByTeam.mockRejectedValue(new Error("fail"));
        await ctrl.getTeamPit(makeReq({ params: { sessionKey: "9158", teamName: "Ferrari" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getTeamStints — retourne les stints", async () => {
        mockSvc.getStintsByTeam.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getTeamStints(makeReq({ params: { sessionKey: "9158", teamName: "Ferrari" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", stints: [] });
    });

    it("getTeamStints — passe l'erreur à next()", async () => {
        mockSvc.getStintsByTeam.mockRejectedValue(new Error("fail"));
        await ctrl.getTeamStints(makeReq({ params: { sessionKey: "9158", teamName: "Ferrari" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    it("getTeamTeamRadio — retourne la radio", async () => {
        mockSvc.getTeamRadioByTeam.mockResolvedValue([]);
        const res = makeRes();
        await ctrl.getTeamTeamRadio(makeReq({ params: { sessionKey: "9158", teamName: "Ferrari" } }), res, next);
        expect(res.json).toHaveBeenCalledWith({ status: "ok", radio: [] });
    });

    it("getTeamTeamRadio — passe l'erreur à next()", async () => {
        mockSvc.getTeamRadioByTeam.mockRejectedValue(new Error("fail"));
        await ctrl.getTeamTeamRadio(makeReq({ params: { sessionKey: "9158", teamName: "Ferrari" } }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });
});
