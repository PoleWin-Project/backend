jest.mock("../../database/sequelize", () => ({
    sequelize: { transaction: jest.fn((cb: (tx: object) => unknown) => cb({})) },
}));

jest.mock("../../database/models", () => ({
    RaceSessionModel: { findOrCreate: jest.fn() },
    PredictionModel: { findOrCreate: jest.fn() },
}));

import { RaceSessionModel, PredictionModel } from "../../database/models";
import { SyncService } from "./sync.service";

const findSession = RaceSessionModel.findOrCreate as jest.Mock;
const findPrediction = PredictionModel.findOrCreate as jest.Mock;

beforeEach(() => {
    findSession.mockReset();
    findPrediction.mockReset();
});

it("creates a question for each relevant session in the same sync", async () => {
    const sessions = [
        { session_key: 1, meeting_key: 10, session_name: "Qualifying", country_name: "France", location: "Paris", date_start: "2026-10-28T10:00:00Z" },
        { session_key: 2, meeting_key: 10, session_name: "Sprint", country_name: "France", location: "Paris", date_start: "2026-10-28T12:00:00Z" },
        { session_key: 3, meeting_key: 10, session_name: "Race", country_name: "France", location: "Paris", date_start: "2026-10-29T12:00:00Z" },
    ];
    const openf1 = { getSessions: jest.fn().mockResolvedValue(sessions) } as any;
    findSession.mockImplementation(async (args) => [{ id: args.where.idCourseExternal, dateStart: args.defaults.dateStart }, true]);
    findPrediction.mockResolvedValue([{}, true]);

    const result = await new SyncService(openf1).syncSeason(2026);

    expect(result).toMatchObject({ sessionsCreated: 3, predictionsCreated: 3 });
    expect(findPrediction.mock.calls.map((call) => call[0].where.type)).toEqual([
        "POLE_POSITION", "SPRINT_WINNER", "RACE_WINNER",
    ]);
    expect(findSession.mock.calls[0][0].defaults.meetingKey).toBe(10);
});

it("does not duplicate existing sessions or questions", async () => {
    const openf1 = { getSessions: jest.fn().mockResolvedValue([{
        session_key: 1, meeting_key: 10, session_name: "Race", country_name: "France",
        location: "Paris", date_start: "2026-10-29T12:00:00Z",
    }]) } as any;
    const session = { id: 1, dateStart: new Date("2026-10-29T12:00:00Z"), update: jest.fn() };
    findSession.mockResolvedValue([session, false]);
    findPrediction.mockResolvedValue([{ resultStatus: "pending", closesAt: session.dateStart }, false]);

    const result = await new SyncService(openf1).syncSeason(2026);

    expect(result).toMatchObject({ sessionsCreated: 0, sessionsUpdated: 1, predictionsCreated: 0 });
    expect(session.update).toHaveBeenCalledTimes(1);
});
