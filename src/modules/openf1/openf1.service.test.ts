const mockFetch = jest.fn();
global.fetch = mockFetch as any;

import { OpenF1Service } from "./openf1.service";
import { openf1Client } from "../../common/clients/openf1.client";
import { OpenF1Meeting, OpenF1Session, OpenF1Driver, OpenF1RaceControl } from "./openf1.types";

jest.mock("../../common/clients/openf1.client", () => ({
    openf1Client: { get: jest.fn() },
}));

const mockGet = openf1Client.get as jest.Mock;

const fakeMeeting: OpenF1Meeting = {
    circuit_key: 1,
    circuit_short_name: "Monza",
    circuit_type: "Permanent",
    circuit_info_url: null,
    circuit_image: null,
    country_code: "IT",
    country_key: 45,
    country_name: "Italy",
    country_flag: null,
    date_start: "2024-08-29T11:30:00+00:00",
    date_end: null,
    gmt_offset: "+01:00",
    location: "Monza",
    meeting_key: 1217,
    meeting_name: "Italian Grand Prix",
    meeting_official_name: "FORMULA 1 PIRELLI GRAN PREMIO D'ITALIA 2024",
    year: 2024,
};

const fakeSession: OpenF1Session = {
    circuit_key: 1,
    circuit_short_name: "Monza",
    country_code: "IT",
    country_key: 45,
    country_name: "Italy",
    date_end: "2024-09-01T15:00:00+00:00",
    date_start: "2024-09-01T13:00:00+00:00",
    gmt_offset: "+01:00",
    location: "Monza",
    meeting_key: 1217,
    session_key: 9158,
    session_name: "Race",
    session_type: "Race",
    year: 2024,
};

const fakeDriver: OpenF1Driver = {
    broadcast_name: "C LECLERC",
    country_code: "MON",
    driver_number: 16,
    first_name: "Charles",
    full_name: "Charles LECLERC",
    headshot_url: null,
    last_name: "LECLERC",
    meeting_key: 1217,
    name_acronym: "LEC",
    session_key: 9158,
    team_colour: "E8002D",
    team_name: "Ferrari",
};

const fakeRaceControl: OpenF1RaceControl = {
    date: "2024-09-01T13:05:00+00:00",
    driver_number: null,
    flag: "YELLOW",
    lap_number: 12,
    message: "SAFETY CAR DEPLOYED",
    meeting_key: 1217,
    scope: "Track",
    sector: null,
    session_key: 9158,
};

function makeErgastDriverResponse() {
    return {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
            MRData: {
                StandingsTable: {
                    StandingsLists: [{
                        DriverStandings: [{
                            position: "1",
                            points:   "150",
                            wins:     "5",
                            Driver: {
                                permanentNumber: "16",
                                givenName:       "Charles",
                                familyName:      "Leclerc",
                                code:            "LEC",
                                nationality:     "Monégasque",
                                driverId:        "leclerc",
                            },
                            Constructors: [{ name: "Ferrari" }],
                        }],
                    }],
                },
            },
        }),
    };
}

function makeErgastTeamResponse() {
    return {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
            MRData: {
                StandingsTable: {
                    StandingsLists: [{
                        ConstructorStandings: [{
                            position: "1",
                            points:   "300",
                            wins:     "10",
                            Constructor: {
                                name:          "Ferrari",
                                constructorId: "ferrari",
                                nationality:   "Italian",
                            },
                        }],
                    }],
                },
            },
        }),
    };
}

describe("OpenF1Service", () => {
    let service: OpenF1Service;

    beforeEach(() => {
        service = new OpenF1Service();
        mockGet.mockReset();
        mockFetch.mockReset();
    });

    // ── getMeetings ────────────────────────────────────────────────────────────

    describe("getMeetings()", () => {
        it("retourne les meetings", async () => {
            mockGet.mockResolvedValue([fakeMeeting]);
            const result = await service.getMeetings({ year: 2024 });
            expect(result).toEqual([fakeMeeting]);
            expect(mockGet).toHaveBeenCalledWith("/meetings", { year: 2024 });
        });

        it("appelle le client sans params si non fournis", async () => {
            mockGet.mockResolvedValue([]);
            await service.getMeetings();
            expect(mockGet).toHaveBeenCalledWith("/meetings", undefined);
        });
    });

    // ── getSessions ────────────────────────────────────────────────────────────

    describe("getSessions()", () => {
        it("retourne les sessions filtrées", async () => {
            mockGet.mockResolvedValue([fakeSession]);
            const result = await service.getSessions({ session_type: "Race", year: 2024 });
            expect(result).toEqual([fakeSession]);
            expect(mockGet).toHaveBeenCalledWith("/sessions", { session_type: "Race", year: 2024 });
        });
    });

    // ── getSessionByKey ────────────────────────────────────────────────────────

    describe("getSessionByKey()", () => {
        it("retourne la session correspondante", async () => {
            mockGet.mockResolvedValue([fakeSession]);
            const result = await service.getSessionByKey(9158);
            expect(result).toEqual(fakeSession);
            expect(mockGet).toHaveBeenCalledWith("/sessions", { session_key: 9158 });
        });

        it("retourne null si aucune session trouvée", async () => {
            mockGet.mockResolvedValue([]);
            const result = await service.getSessionByKey(9999);
            expect(result).toBeNull();
        });
    });

    // ── getDrivers ─────────────────────────────────────────────────────────────

    describe("getDrivers()", () => {
        it("retourne les pilotes de la session", async () => {
            mockGet.mockResolvedValue([fakeDriver]);
            const result = await service.getDrivers(9158);
            expect(result).toEqual([fakeDriver]);
            expect(mockGet).toHaveBeenCalledWith("/drivers", { session_key: 9158 });
        });
    });

    // ── getRaceControl ─────────────────────────────────────────────────────────

    describe("getRaceControl()", () => {
        it("retourne les événements race control", async () => {
            mockGet.mockResolvedValue([fakeRaceControl]);
            const result = await service.getRaceControl(9158);
            expect(result).toEqual([fakeRaceControl]);
            expect(mockGet).toHaveBeenCalledWith("/race_control", { session_key: 9158 });
        });
    });

    // ── getLatestSession ───────────────────────────────────────────────────────

    describe("getLatestSession()", () => {
        it("appelle le client avec session_key=latest", async () => {
            mockGet.mockResolvedValue([fakeSession]);
            const result = await service.getLatestSession();
            expect(result).toEqual(fakeSession);
            expect(mockGet).toHaveBeenCalledWith("/sessions", { session_key: "latest" });
        });

        it("retourne null si l'API répond vide", async () => {
            mockGet.mockResolvedValue([]);
            expect(await service.getLatestSession()).toBeNull();
        });
    });

    // ── getLatestMeeting ───────────────────────────────────────────────────────

    describe("getLatestMeeting()", () => {
        it("appelle le client avec meeting_key=latest", async () => {
            mockGet.mockResolvedValue([fakeMeeting]);
            const result = await service.getLatestMeeting();
            expect(result).toEqual(fakeMeeting);
            expect(mockGet).toHaveBeenCalledWith("/meetings", { meeting_key: "latest" });
        });

        it("retourne null si l'API répond vide", async () => {
            mockGet.mockResolvedValue([]);
            expect(await service.getLatestMeeting()).toBeNull();
        });
    });

    // ── getCalendar ────────────────────────────────────────────────────────────

    describe("getCalendar()", () => {
        it("passe l'année fournie au client", async () => {
            mockGet.mockResolvedValue([fakeMeeting]);
            await service.getCalendar(2024);
            expect(mockGet).toHaveBeenCalledWith("/meetings", { year: 2024 });
        });

        it("utilise l'année courante si non fournie", async () => {
            mockGet.mockResolvedValue([]);
            await service.getCalendar();
            expect(mockGet).toHaveBeenCalledWith("/meetings", { year: new Date().getFullYear() });
        });
    });

    // ── getUpcomingSessions ────────────────────────────────────────────────────

    describe("getUpcomingSessions()", () => {
        it("filtre les sessions passées et trie par date croissante", async () => {
            const future1 = { ...fakeSession, date_start: "2099-01-01T00:00:00+00:00" };
            const future2 = { ...fakeSession, date_start: "2099-02-01T00:00:00+00:00" };
            const past    = { ...fakeSession, date_start: "2020-01-01T00:00:00+00:00" };
            mockGet.mockResolvedValue([future2, past, future1]);
            const result = await service.getUpcomingSessions(10);
            expect(result).toHaveLength(2);
            expect(result[0].date_start).toBe(future1.date_start);
            expect(result[1].date_start).toBe(future2.date_start);
        });

        it("limite le nombre de résultats", async () => {
            const futures = [1, 2, 3, 4, 5].map(i => ({
                ...fakeSession, date_start: `2099-0${i}-01T00:00:00+00:00`,
            }));
            mockGet.mockResolvedValue(futures);
            const result = await service.getUpcomingSessions(3);
            expect(result).toHaveLength(3);
        });

        it("utilise limit=10 par défaut (branche paramètre par défaut)", async () => {
            mockGet.mockResolvedValue([]);
            const result = await service.getUpcomingSessions(); // no arg → limit=10 default
            expect(result).toEqual([]);
        });
    });

    // ── getNextSession ─────────────────────────────────────────────────────────

    describe("getNextSession()", () => {
        it("retourne la prochaine session", async () => {
            const future = { ...fakeSession, date_start: "2099-01-01T00:00:00+00:00" };
            mockGet.mockResolvedValue([future]);
            expect(await service.getNextSession()).toEqual(future);
        });

        it("retourne null si aucune session future", async () => {
            mockGet.mockResolvedValue([]);
            expect(await service.getNextSession()).toBeNull();
        });
    });

    // ── Session-data delegates ─────────────────────────────────────────────────

    describe("getWeather()", () => {
        it("délègue au client openf1", async () => {
            mockGet.mockResolvedValue([]);
            await service.getWeather(9158);
            expect(mockGet).toHaveBeenCalledWith("/weather", { session_key: 9158 });
        });
    });

    describe("getPitStops()", () => {
        it("délègue au client openf1", async () => {
            mockGet.mockResolvedValue([]);
            await service.getPitStops(9158);
            expect(mockGet).toHaveBeenCalledWith("/pit", { session_key: 9158 });
        });
    });

    describe("getStints()", () => {
        it("délègue au client openf1", async () => {
            mockGet.mockResolvedValue([]);
            await service.getStints(9158);
            expect(mockGet).toHaveBeenCalledWith("/stints", { session_key: 9158 });
        });
    });

    describe("getTeamRadio()", () => {
        it("délègue au client openf1", async () => {
            mockGet.mockResolvedValue([]);
            await service.getTeamRadio(9158);
            expect(mockGet).toHaveBeenCalledWith("/team_radio", { session_key: 9158 });
        });
    });

    describe("getPositions()", () => {
        it("délègue au client openf1", async () => {
            mockGet.mockResolvedValue([]);
            await service.getPositions(9158);
            expect(mockGet).toHaveBeenCalledWith("/position", { session_key: 9158 });
        });
    });

    describe("getLaps()", () => {
        it("délègue au client openf1", async () => {
            mockGet.mockResolvedValue([]);
            await service.getLaps(9158);
            expect(mockGet).toHaveBeenCalledWith("/laps", { session_key: 9158 });
        });
    });

    describe("getIntervals()", () => {
        it("délègue au client openf1", async () => {
            mockGet.mockResolvedValue([]);
            await service.getIntervals(9158);
            expect(mockGet).toHaveBeenCalledWith("/intervals", { session_key: 9158 });
        });
    });

    // ── getLocations ───────────────────────────────────────────────────────────

    describe("getLocations()", () => {
        it("retourne [] si le résultat est vide", async () => {
            mockGet.mockResolvedValue([]);
            expect(await service.getLocations(9158)).toEqual([]);
        });

        it("retourne [] si le résultat n'est pas un tableau", async () => {
            mockGet.mockResolvedValue(null as any);
            expect(await service.getLocations(9158)).toEqual([]);
        });

        it("garde la position la plus récente par pilote", async () => {
            const older = { driver_number: 1, date: "2024-01-01T12:00:00", x: 100, y: 200 };
            const newer = { driver_number: 1, date: "2024-01-01T13:00:00", x: 150, y: 250 };
            mockGet.mockResolvedValue([older, newer]);
            const result = await service.getLocations(9158);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(newer);
        });

        it("ignore les entrées plus anciennes pour le même pilote", async () => {
            const newer = { driver_number: 1, date: "2024-01-01T13:00:00", x: 150, y: 250 };
            const older = { driver_number: 1, date: "2024-01-01T12:00:00", x: 100, y: 200 };
            mockGet.mockResolvedValue([newer, older]);
            const result = await service.getLocations(9158);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(newer);
        });

        it("garde l'existant si la nouvelle entrée n'a pas de date", async () => {
            const existing = { driver_number: 1, date: "2024-01-01T12:00:00", x: 100, y: 200 };
            const noDate   = { driver_number: 1, date: null, x: 999, y: 999 };
            mockGet.mockResolvedValue([existing, noDate]);
            const result = await service.getLocations(9158);
            expect(result[0]).toEqual(existing);
        });
    });

    // ── getLatestPositions ─────────────────────────────────────────────────────

    describe("getLatestPositions()", () => {
        it("retourne [] si le résultat est vide", async () => {
            mockGet.mockResolvedValue([]);
            expect(await service.getLatestPositions(9158)).toEqual([]);
        });

        it("filtre les entrées sans position ou driver_number", async () => {
            mockGet.mockResolvedValue([
                { driver_number: 1,    position: 1,    date: "2024-01-01T12:00:00" },
                { driver_number: null, position: 2,    date: "2024-01-01T12:01:00" },
                { driver_number: 2,    position: null, date: "2024-01-01T12:01:00" },
            ]);
            const result = await service.getLatestPositions(9158);
            expect(result).toHaveLength(1);
            expect(result[0].driver_number).toBe(1);
        });

        it("garde la position la plus récente et trie par position", async () => {
            mockGet.mockResolvedValue([
                { driver_number: 2, position: 2, date: "2024-01-01T12:00:00" },
                { driver_number: 1, position: 1, date: "2024-01-01T12:00:00" },
                { driver_number: 2, position: 2, date: "2024-01-01T13:00:00" },
            ]);
            const result = await service.getLatestPositions(9158);
            expect(result[0].driver_number).toBe(1);
            expect(result[1].driver_number).toBe(2);
        });

        it("garde l'existant si la nouvelle entrée est plus ancienne", async () => {
            mockGet.mockResolvedValue([
                { driver_number: 1, position: 1, date: "2024-01-01T13:00:00" },
                { driver_number: 1, position: 2, date: "2024-01-01T12:00:00" },
            ]);
            const result = await service.getLatestPositions(9158);
            expect(result).toHaveLength(1);
            expect(result[0].position).toBe(1);
        });
    });

    // ── getSessionResults ──────────────────────────────────────────────────────

    describe("getSessionResults()", () => {
        it("retourne null si la session n'est pas trouvée", async () => {
            mockGet.mockResolvedValue([]);
            expect(await service.getSessionResults(9999)).toBeNull();
        });

        it("retourne les résultats de course via session_type='Race'", async () => {
            mockGet
                .mockResolvedValueOnce([fakeSession])
                .mockResolvedValueOnce([fakeDriver])
                .mockResolvedValueOnce([{ driver_number: 16, position: 1 }]);
            const result = await service.getSessionResults(9158);
            expect(result![0].position).toBe(1);
            expect(result![0].driver_number).toBe(16);
        });

        it("trie les résultats de course avec plusieurs positions (couvre le callback de sort)", async () => {
            const driver2: OpenF1Driver = { ...fakeDriver, driver_number: 1, name_acronym: "VER" };
            mockGet
                .mockResolvedValueOnce([fakeSession])
                .mockResolvedValueOnce([fakeDriver, driver2])
                .mockResolvedValueOnce([
                    { driver_number: 16, position: 2 },
                    { driver_number: 1,  position: 1 },
                ]);
            const result = await service.getSessionResults(9158);
            expect(result![0].position).toBe(1);
            expect(result![0].driver_number).toBe(1);
            expect(result![1].position).toBe(2);
            expect(result![1].driver_number).toBe(16);
        });

        it("retourne les résultats de course si session_name contient 'race'", async () => {
            const raceByName = { ...fakeSession, session_type: "Other", session_name: "Feature Race" };
            mockGet
                .mockResolvedValueOnce([raceByName])
                .mockResolvedValueOnce([fakeDriver])
                .mockResolvedValueOnce([{ driver_number: 16, position: 1 }]);
            const result = await service.getSessionResults(9158);
            expect(result![0].position).toBe(1);
        });

        it("retourne les résultats de course si session_name contient 'sprint'", async () => {
            const sprintSession = { ...fakeSession, session_type: "Other", session_name: "Sprint Race" };
            mockGet
                .mockResolvedValueOnce([sprintSession])
                .mockResolvedValueOnce([fakeDriver])
                .mockResolvedValueOnce([{ driver_number: 16, position: 1 }]);
            const result = await service.getSessionResults(9158);
            expect(result![0].position).toBe(1);
        });

        it("retourne les résultats de qualif via meilleur temps au tour", async () => {
            const qualifySession = { ...fakeSession, session_type: "Qualifying", session_name: "Qualifying" };
            mockGet
                .mockResolvedValueOnce([qualifySession])
                .mockResolvedValueOnce([fakeDriver])
                .mockResolvedValueOnce([
                    { driver_number: 16, lap_duration: null },   // null → ignoré
                    { driver_number: 16, lap_duration: 80.5 },   // premier tour valide
                    { driver_number: 16, lap_duration: 79.0 },   // meilleur → remplace
                    { driver_number: 16, lap_duration: 82.0 },   // plus lent → ignoré
                ]);
            const result = await service.getSessionResults(9158) as any[];
            expect(result![0].time).toBe(79.0);
            expect(result![0].position).toBe(1);
        });

        it("trie les résultats de qualif avec plusieurs pilotes (couvre le callback de sort)", async () => {
            const qualifySession = { ...fakeSession, session_type: "Qualifying", session_name: "Qualifying" };
            const driver2: OpenF1Driver = { ...fakeDriver, driver_number: 1, name_acronym: "VER" };
            mockGet
                .mockResolvedValueOnce([qualifySession])
                .mockResolvedValueOnce([fakeDriver, driver2])
                .mockResolvedValueOnce([
                    { driver_number: 16, lap_duration: 80.5 },
                    { driver_number: 1,  lap_duration: 78.0 },
                ]);
            const result = await service.getSessionResults(9158) as any[];
            expect(result[0].driver_number).toBe(1);    // plus rapide
            expect(result[0].position).toBe(1);
            expect(result[1].driver_number).toBe(16);   // plus lent
            expect(result[1].position).toBe(2);
        });
    });

    // ── getDriverStandings ─────────────────────────────────────────────────────

    describe("getDriverStandings()", () => {
        it("retourne les classements avec les données OpenF1", async () => {
            mockFetch.mockResolvedValue(makeErgastDriverResponse());
            mockGet
                .mockResolvedValueOnce([fakeSession])
                .mockResolvedValueOnce([fakeDriver]);
            const result = await service.getDriverStandings(2024);
            expect(result).toHaveLength(1);
            expect(result[0].driver_number).toBe(16);
            expect(result[0].position).toBe(1);
        });

        it("utilise 'current' si year n'est pas fourni", async () => {
            mockFetch.mockResolvedValue(makeErgastDriverResponse());
            mockGet
                .mockResolvedValueOnce([fakeSession])
                .mockResolvedValueOnce([fakeDriver]);
            await service.getDriverStandings();
            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain("/current/");
        });

        it("retourne les classements sans données OpenF1 si latestSession est null", async () => {
            mockFetch.mockResolvedValue(makeErgastDriverResponse());
            mockGet.mockResolvedValue([]);
            const result = await service.getDriverStandings(2024);
            expect(result).toHaveLength(1);
            expect(result[0].driver.full_name).toBe("Charles Leclerc");
        });

        it("retourne [] si le fetch Ergast échoue", async () => {
            mockFetch.mockRejectedValue(new Error("Ergast down"));
            expect(await service.getDriverStandings(2024)).toEqual([]);
        });

        it("retourne [] si la réponse Ergast n'est pas ok", async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 500 });
            expect(await service.getDriverStandings(2024)).toEqual([]);
        });

        it("retourne [] si StandingsLists est vide (branche || [])", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    MRData: { StandingsTable: { StandingsLists: [] } },
                }),
            });
            mockGet.mockResolvedValue([]);
            expect(await service.getDriverStandings(2024)).toEqual([]);
        });
    });

    // ── getTeamStandings ───────────────────────────────────────────────────────

    describe("getTeamStandings()", () => {
        it("retourne les classements constructeurs avec team_colour si trouvé", async () => {
            mockFetch.mockResolvedValue(makeErgastTeamResponse());
            mockGet
                .mockResolvedValueOnce([fakeSession])
                .mockResolvedValueOnce([fakeDriver]);
            const result = await service.getTeamStandings(2024);
            expect(result).toHaveLength(1);
            expect(result[0].team_name).toBe("Ferrari");
            expect(result[0].team_colour).toBe("E8002D");
        });

        it("team_colour est undefined si aucune team OpenF1 ne correspond", async () => {
            mockFetch.mockResolvedValue(makeErgastTeamResponse());
            const unknownTeamDriver = { ...fakeDriver, team_name: "SomeOtherTeam", team_colour: "000000" };
            mockGet
                .mockResolvedValueOnce([fakeSession])
                .mockResolvedValueOnce([unknownTeamDriver]);
            const result = await service.getTeamStandings(2024);
            expect(result[0].team_colour).toBeUndefined();
        });

        it("retourne les classements sans team_colour si latestSession est null", async () => {
            mockFetch.mockResolvedValue(makeErgastTeamResponse());
            mockGet.mockResolvedValue([]);
            const result = await service.getTeamStandings(2024);
            expect(result).toHaveLength(1);
            expect(result[0].team_colour).toBeUndefined();
        });

        it("retourne [] si le fetch Ergast échoue", async () => {
            mockFetch.mockRejectedValue(new Error("network error"));
            expect(await service.getTeamStandings(2024)).toEqual([]);
        });

        it("retourne [] si la réponse Ergast n'est pas ok", async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 503 });
            expect(await service.getTeamStandings(2024)).toEqual([]);
        });

        it("retourne [] si StandingsLists est vide (branche || [])", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    MRData: { StandingsTable: { StandingsLists: [] } },
                }),
            });
            mockGet.mockResolvedValue([]);
            expect(await service.getTeamStandings(2024)).toEqual([]);
        });

        it("utilise year='current' par défaut (branche ?? 'current')", async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 404 });
            expect(await service.getTeamStandings()).toEqual([]); // no arg → y="current"
        });
    });

    // ── listDrivers ────────────────────────────────────────────────────────────

    describe("listDrivers()", () => {
        it("délègue au client avec params", async () => {
            mockGet.mockResolvedValue([fakeDriver]);
            await service.listDrivers({ name_acronym: "LEC" });
            expect(mockGet).toHaveBeenCalledWith("/drivers", { name_acronym: "LEC" });
        });
    });

    // ── getDriverByNumber ──────────────────────────────────────────────────────

    describe("getDriverByNumber()", () => {
        it("retourne le dernier pilote trouvé", async () => {
            mockGet.mockResolvedValue([fakeDriver]);
            expect(await service.getDriverByNumber(16)).toEqual(fakeDriver);
        });

        it("retourne null si aucun pilote", async () => {
            mockGet.mockResolvedValue([]);
            expect(await service.getDriverByNumber(99)).toBeNull();
        });

        it("inclut session_key si fourni", async () => {
            mockGet.mockResolvedValue([fakeDriver]);
            await service.getDriverByNumber(16, 9158);
            expect(mockGet).toHaveBeenCalledWith("/drivers", { driver_number: 16, session_key: 9158 });
        });

        it("n'inclut pas session_key si non fourni", async () => {
            mockGet.mockResolvedValue([fakeDriver]);
            await service.getDriverByNumber(16);
            expect(mockGet).toHaveBeenCalledWith("/drivers", { driver_number: 16 });
        });
    });

    // ── getTeamsForSession / driversToTeams ────────────────────────────────────

    describe("getTeamsForSession()", () => {
        it("regroupe les pilotes par équipe et trie alphabétiquement", async () => {
            const sainz: OpenF1Driver = {
                ...fakeDriver, driver_number: 55, name_acronym: "SAI",
                full_name: "Carlos SAINZ", headshot_url: null,
            };
            const verstappen: OpenF1Driver = {
                ...fakeDriver, driver_number: 1, name_acronym: "VER",
                full_name: "Max VERSTAPPEN", team_name: "Red Bull Racing", team_colour: "3671C6",
            };
            mockGet.mockResolvedValue([fakeDriver, sainz, verstappen]);
            const result = await service.getTeamsForSession(9158);
            expect(result).toHaveLength(2);
            expect(result[0].team_name).toBe("Ferrari");
            expect(result[0].drivers).toHaveLength(2);
            expect(result[1].team_name).toBe("Red Bull Racing");
        });
    });

    // ── listTeams ──────────────────────────────────────────────────────────────

    describe("listTeams()", () => {
        it("utilise 'latest' si sessionKey non fourni", async () => {
            mockGet.mockResolvedValue([fakeDriver]);
            await service.listTeams();
            expect(mockGet).toHaveBeenCalledWith("/drivers", { session_key: "latest" });
        });

        it("utilise le sessionKey fourni", async () => {
            mockGet.mockResolvedValue([fakeDriver]);
            await service.listTeams(9158);
            expect(mockGet).toHaveBeenCalledWith("/drivers", { session_key: 9158 });
        });
    });

    // ── By-driver sub-routes ───────────────────────────────────────────────────

    describe("getPitStopsByDriver()", () => {
        it("délègue au client", async () => {
            mockGet.mockResolvedValue([]);
            await service.getPitStopsByDriver(9158, 16);
            expect(mockGet).toHaveBeenCalledWith("/pit", { session_key: 9158, driver_number: 16 });
        });
    });

    describe("getStintsByDriver()", () => {
        it("délègue au client", async () => {
            mockGet.mockResolvedValue([]);
            await service.getStintsByDriver(9158, 16);
            expect(mockGet).toHaveBeenCalledWith("/stints", { session_key: 9158, driver_number: 16 });
        });
    });

    describe("getTeamRadioByDriver()", () => {
        it("délègue au client", async () => {
            mockGet.mockResolvedValue([]);
            await service.getTeamRadioByDriver(9158, 16);
            expect(mockGet).toHaveBeenCalledWith("/team_radio", { session_key: 9158, driver_number: 16 });
        });
    });

    // ── By-team sub-routes ─────────────────────────────────────────────────────

    describe("getPitStopsByTeam()", () => {
        it("agrège et trie les pit-stops des pilotes de l'équipe", async () => {
            const sainz: OpenF1Driver = {
                ...fakeDriver, driver_number: 55, name_acronym: "SAI",
                full_name: "Carlos SAINZ", headshot_url: null,
            };
            mockGet
                .mockResolvedValueOnce([fakeDriver, sainz])
                .mockResolvedValueOnce([{ lap_number: 25, driver_number: 16 }])
                .mockResolvedValueOnce([{ lap_number: 20, driver_number: 55 }]);
            const result = await service.getPitStopsByTeam(9158, "Ferrari");
            expect(result).toHaveLength(2);
            expect(result[0].lap_number).toBe(20);
            expect(result[1].lap_number).toBe(25);
        });
    });

    describe("getStintsByTeam()", () => {
        it("agrège et trie les stints par lap_start", async () => {
            const sainz: OpenF1Driver = {
                ...fakeDriver, driver_number: 55, name_acronym: "SAI",
                full_name: "Carlos SAINZ", headshot_url: null,
            };
            mockGet
                .mockResolvedValueOnce([fakeDriver, sainz])
                .mockResolvedValueOnce([{ lap_start: 30, driver_number: 16 }])
                .mockResolvedValueOnce([{ lap_start: 10, driver_number: 55 }]);
            const result = await service.getStintsByTeam(9158, "Ferrari");
            expect(result).toHaveLength(2);
            expect(result[0].lap_start).toBe(10);
        });
    });

    describe("getTeamRadioByTeam()", () => {
        it("agrège et trie les radio par date", async () => {
            const sainz: OpenF1Driver = {
                ...fakeDriver, driver_number: 55, name_acronym: "SAI",
                full_name: "Carlos SAINZ", headshot_url: null,
            };
            mockGet
                .mockResolvedValueOnce([fakeDriver, sainz])
                .mockResolvedValueOnce([{ date: "2024-09-01T14:00:00", driver_number: 16 }])
                .mockResolvedValueOnce([{ date: "2024-09-01T13:00:00", driver_number: 55 }]);
            const result = await service.getTeamRadioByTeam(9158, "Ferrari");
            expect(result).toHaveLength(2);
            expect(result[0].date).toBe("2024-09-01T13:00:00");
        });
    });
});
