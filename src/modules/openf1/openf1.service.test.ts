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
