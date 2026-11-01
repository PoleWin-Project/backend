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

describe("OpenF1Service", () => {
    let service: OpenF1Service;

    beforeEach(() => {
        service = new OpenF1Service();
        mockGet.mockReset();
    });

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

    describe("getSessions()", () => {
        it("retourne les sessions filtrées", async () => {
            mockGet.mockResolvedValue([fakeSession]);
            const result = await service.getSessions({ session_type: "Race", year: 2024 });
            expect(result).toEqual([fakeSession]);
            expect(mockGet).toHaveBeenCalledWith("/sessions", { session_type: "Race", year: 2024 });
        });
    });

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

    describe("getDrivers()", () => {
        it("retourne les pilotes de la session", async () => {
            mockGet.mockResolvedValue([fakeDriver]);
            const result = await service.getDrivers(9158);
            expect(result).toEqual([fakeDriver]);
            expect(mockGet).toHaveBeenCalledWith("/drivers", { session_key: 9158 });
        });
    });

    describe("getDriversWithFallback()", () => {
        it("utilise directement le classement pour une session future", async () => {
            const futureSession = { ...fakeSession, date_start: "2999-09-01T13:00:00+00:00" };
            jest.spyOn(service, "getSessionByKey").mockResolvedValue(futureSession);
            jest.spyOn(service, "getSessions").mockResolvedValue([]);
            const directDrivers = jest.spyOn(service, "getDrivers");
            jest.spyOn(service, "getDriverStandings").mockResolvedValue([
                { driver_number: 16, driver: fakeDriver },
            ]);

            const result = await service.getDriversWithFallback(futureSession.session_key);

            expect(result).toEqual([fakeDriver]);
            expect(directDrivers).not.toHaveBeenCalled();
        });

        it("reprend la grille de la session précédente lors d'un remplacement", async () => {
            const futureRace = { ...fakeSession, session_key: 11404, date_start: "2999-09-01T13:00:00+00:00" };
            const qualifying = { ...fakeSession, session_key: 11400, date_start: "2026-10-31T21:00:00+00:00" };
            const hirakawa: OpenF1Driver = {
                ...fakeDriver,
                driver_number: 50,
                full_name: "Ryo HIRAKAWA",
                name_acronym: "HIR",
                session_key: 11400,
                team_name: "Haas F1 Team",
            };
            jest.spyOn(service, "getSessionByKey").mockResolvedValue(futureRace);
            jest.spyOn(service, "getSessions").mockResolvedValue([qualifying, futureRace]);
            jest.spyOn(service, "getDrivers").mockResolvedValue([hirakawa]);
            const standings = jest.spyOn(service, "getDriverStandings");

            const result = await service.getDriversWithFallback(futureRace.session_key);

            expect(result).toEqual([hirakawa]);
            expect(service.getDrivers).toHaveBeenCalledWith(qualifying.session_key);
            expect(standings).not.toHaveBeenCalled();
        });

        it("retombe sur le classement si la source session échoue", async () => {
            jest.spyOn(service, "getSessionByKey").mockRejectedValue(new Error("OpenF1 unavailable"));
            jest.spyOn(service, "getDrivers").mockRejectedValue(new Error("OpenF1 unavailable"));
            jest.spyOn(service, "getDriverStandings").mockResolvedValue([
                { driver_number: 16, driver: fakeDriver },
            ]);

            const result = await service.getDriversWithFallback(fakeSession.session_key);

            expect(result).toEqual([fakeDriver]);
        });
    });

    describe("getDriverStandings()", () => {
        it("conserve le classement si l'enrichissement OpenF1 échoue", async () => {
            const warnMock = jest.spyOn(console, "warn").mockImplementation(() => {});
            const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({
                    MRData: {
                        StandingsTable: {
                            StandingsLists: [{
                                DriverStandings: [{
                                    position: "1",
                                    points: "25",
                                    wins: "1",
                                    Driver: {
                                        permanentNumber: "16",
                                        givenName: "Charles",
                                        familyName: "Leclerc",
                                        code: "LEC",
                                        nationality: "Monegasque",
                                        driverId: "leclerc",
                                    },
                                    Constructors: [{ name: "Ferrari" }],
                                }, {
                                    position: "2",
                                    points: "10",
                                    wins: "0",
                                    Driver: {
                                        givenName: "Ryo",
                                        familyName: "Hirakawa",
                                        nationality: "Japanese",
                                        driverId: "ryo_hirakawa",
                                    },
                                    Constructors: [{ name: "Haas F1 Team" }],
                                }],
                            }],
                        },
                    },
                }),
            } as any);
            const hirakawa: OpenF1Driver = {
                ...fakeDriver,
                driver_number: 50,
                full_name: "Ryo Hirakawa",
                name_acronym: "HIR",
                team_name: "Haas F1 Team",
            };
            jest.spyOn(service, "getLatestSession").mockResolvedValue(fakeSession);
            jest.spyOn(service, "getDrivers").mockResolvedValue([hirakawa]);

            const result = await service.getDriverStandings(2026);

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                driver_number: 16,
                driver: { full_name: "Charles Leclerc", name_acronym: "LEC", team_name: "Ferrari" },
            });
            expect(result[1]).toMatchObject({
                driver_number: 50,
                driver: { full_name: "Ryo Hirakawa", name_acronym: "HIR", driver_id: "ryo_hirakawa" },
            });
            fetchMock.mockRestore();
            warnMock.mockRestore();
        });
    });

    describe("getRaceControl()", () => {
        it("retourne les événements race control", async () => {
            mockGet.mockResolvedValue([fakeRaceControl]);
            const result = await service.getRaceControl(9158);
            expect(result).toEqual([fakeRaceControl]);
            expect(mockGet).toHaveBeenCalledWith("/race_control", { session_key: 9158 });
        });
    });

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
});
