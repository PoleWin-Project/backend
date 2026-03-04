import request from "supertest";
import express from "express";
import openf1Routes from "../modules/openf1/openf1.routes";
import { errorHandler } from "../common/middleware/errorHandler";
import { notFound } from "../common/middleware/notFound";

jest.mock("../common/clients/openf1.client", () => ({
    openf1Client: { get: jest.fn() },
}));

import { openf1Client } from "../common/clients/openf1.client";
const mockGet = openf1Client.get as jest.Mock;

function buildTestApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/v1", openf1Routes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

const fakeMeeting = {
    meeting_key: 1217,
    meeting_name: "Italian Grand Prix",
    meeting_official_name: "FORMULA 1 PIRELLI GRAN PREMIO D'ITALIA 2024",
    circuit_short_name: "Monza",
    country_name: "Italy",
    country_code: "IT",
    country_key: 45,
    circuit_key: 1,
    location: "Monza",
    date_start: "2024-08-29T11:30:00+00:00",
    gmt_offset: "+01:00",
    year: 2024,
};

const fakeSession = {
    session_key: 9158,
    meeting_key: 1217,
    session_name: "Race",
    session_type: "Race",
    circuit_key: 1,
    circuit_short_name: "Monza",
    country_code: "IT",
    country_key: 45,
    country_name: "Italy",
    date_start: "2024-09-01T13:00:00+00:00",
    date_end: "2024-09-01T15:00:00+00:00",
    gmt_offset: "+01:00",
    location: "Monza",
    year: 2024,
};

const fakeDriver = {
    driver_number: 16,
    full_name: "Charles LECLERC",
    name_acronym: "LEC",
    team_name: "Ferrari",
    team_colour: "E8002D",
    country_code: "MON",
    headshot_url: null,
    broadcast_name: "C LECLERC",
    first_name: "Charles",
    last_name: "LECLERC",
    meeting_key: 1217,
    session_key: 9158,
};

const fakeRaceControl = {
    date: "2024-09-01T13:05:00+00:00",
    message: "SAFETY CAR DEPLOYED",
    flag: "YELLOW",
    scope: "Track",
    sector: null,
    lap_number: 12,
    driver_number: null,
    meeting_key: 1217,
    session_key: 9158,
};

describe("GET /api/v1/openf1/meetings", () => {
    const app = buildTestApp();

    it("retourne la liste des meetings", async () => {
        mockGet.mockResolvedValue([fakeMeeting]);
        const res = await request(app).get("/api/v1/openf1/meetings");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.meetings).toHaveLength(1);
        expect(res.body.meetings[0].meeting_key).toBe(1217);
    });

    it("passe le filtre year au service", async () => {
        mockGet.mockResolvedValue([fakeMeeting]);
        await request(app).get("/api/v1/openf1/meetings?year=2024");
        expect(mockGet).toHaveBeenCalledWith("/meetings", expect.objectContaining({ year: 2024 }));
    });

    it("retourne un tableau vide si aucun meeting", async () => {
        mockGet.mockResolvedValue([]);
        const res = await request(app).get("/api/v1/openf1/meetings");
        expect(res.status).toBe(200);
        expect(res.body.meetings).toEqual([]);
    });
});

describe("GET /api/v1/openf1/meetings/latest", () => {
    const app = buildTestApp();

    it("retourne le meeting courant", async () => {
        mockGet.mockResolvedValue([fakeMeeting]);
        const res = await request(app).get("/api/v1/openf1/meetings/latest");
        expect(res.status).toBe(200);
        expect(res.body.meeting.meeting_name).toBe("Italian Grand Prix");
    });

    it("retourne null si aucun meeting", async () => {
        mockGet.mockResolvedValue([]);
        const res = await request(app).get("/api/v1/openf1/meetings/latest");
        expect(res.status).toBe(200);
        expect(res.body.meeting).toBeNull();
    });
});

describe("GET /api/v1/openf1/sessions", () => {
    const app = buildTestApp();

    it("retourne les sessions", async () => {
        mockGet.mockResolvedValue([fakeSession]);
        const res = await request(app).get("/api/v1/openf1/sessions");
        expect(res.status).toBe(200);
        expect(res.body.sessions).toHaveLength(1);
        expect(res.body.sessions[0].session_key).toBe(9158);
    });

    it("passe les filtres meeting_key et session_type", async () => {
        mockGet.mockResolvedValue([fakeSession]);
        await request(app).get("/api/v1/openf1/sessions?meeting_key=1217&session_type=Race");
        expect(mockGet).toHaveBeenCalledWith(
            "/sessions",
            expect.objectContaining({ meeting_key: 1217, session_type: "Race" }),
        );
    });
});

describe("GET /api/v1/openf1/sessions/latest", () => {
    const app = buildTestApp();

    it("retourne la session en cours", async () => {
        mockGet.mockResolvedValue([fakeSession]);
        const res = await request(app).get("/api/v1/openf1/sessions/latest");
        expect(res.status).toBe(200);
        expect(res.body.session.session_type).toBe("Race");
    });
});

describe("GET /api/v1/openf1/sessions/:sessionKey", () => {
    const app = buildTestApp();

    it("retourne la session correspondante", async () => {
        mockGet.mockResolvedValue([fakeSession]);
        const res = await request(app).get("/api/v1/openf1/sessions/9158");
        expect(res.status).toBe(200);
        expect(res.body.session.session_key).toBe(9158);
    });

    it("retourne 404 si session introuvable", async () => {
        mockGet.mockResolvedValue([]);
        const res = await request(app).get("/api/v1/openf1/sessions/9999");
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    it("propage l'erreur si l'API OpenF1 est indisponible", async () => {
        mockGet.mockRejectedValue(new Error("OpenF1 API error 503: Service Unavailable"));
        const res = await request(app).get("/api/v1/openf1/sessions/9158");
        expect(res.status).toBe(500);
    });
});

describe("GET /api/v1/openf1/sessions/:sessionKey/drivers", () => {
    const app = buildTestApp();

    it("retourne les pilotes de la session", async () => {
        mockGet.mockResolvedValue([fakeDriver]);
        const res = await request(app).get("/api/v1/openf1/sessions/9158/drivers");
        expect(res.status).toBe(200);
        expect(res.body.drivers).toHaveLength(1);
        expect(res.body.drivers[0].name_acronym).toBe("LEC");
    });

    it("retourne un tableau vide si pas de pilotes", async () => {
        mockGet.mockResolvedValue([]);
        const res = await request(app).get("/api/v1/openf1/sessions/9999/drivers");
        expect(res.status).toBe(200);
        expect(res.body.drivers).toEqual([]);
    });
});

describe("GET /api/v1/openf1/sessions/:sessionKey/race-control", () => {
    const app = buildTestApp();

    it("retourne les événements race control", async () => {
        mockGet.mockResolvedValue([fakeRaceControl]);
        const res = await request(app).get("/api/v1/openf1/sessions/9158/race-control");
        expect(res.status).toBe(200);
        expect(res.body.events).toHaveLength(1);
        expect(res.body.events[0].message).toBe("SAFETY CAR DEPLOYED");
    });

    it("retourne un tableau vide si aucun événement", async () => {
        mockGet.mockResolvedValue([]);
        const res = await request(app).get("/api/v1/openf1/sessions/9999/race-control");
        expect(res.status).toBe(200);
        expect(res.body.events).toEqual([]);
    });
});
