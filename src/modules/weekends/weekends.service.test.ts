jest.mock("../../database/models", () => ({
    RaceSessionModel: { findAll: jest.fn(), findOne: jest.fn() },
    PredictionModel: {},
}));

import { RaceSessionModel } from "../../database/models";
import { WeekendsService } from "./weekends.service";

const findAll = RaceSessionModel.findAll as jest.Mock;

beforeEach(() => findAll.mockReset());

it("returns sessions, deadlines, choices and result state for one Grand Prix", async () => {
    const future = new Date(Date.now() + 60_000);
    findAll.mockResolvedValue([{
        id: 1, meetingKey: 10, idCourseExternal: 42, name: "France - Race", type: "Race",
        location: "Paris", dateStart: future,
        predictions: [{ id: 2, type: "RACE_WINNER", closesAt: future, resultStatus: "pending", winningValue: null }],
    }]);
    const openf1 = {
        getSessions: jest.fn().mockResolvedValue([{ session_key: 40, date_start: "2026-01-01T00:00:00Z", date_end: "2026-01-01T02:00:00Z" }]),
        getDrivers: jest.fn().mockResolvedValue([{ driver_number: 16, name_acronym: "LEC", full_name: "Charles Leclerc", team_name: "Ferrari" }]),
    } as any;

    const result = await new WeekendsService(openf1).get(10);

    expect(result.meetingKey).toBe(10);
    expect(result.drivers).toEqual([{ driverNumber: 16, code: "LEC", name: "Charles Leclerc", team: "Ferrari" }]);
    expect(result.sessions[0].predictions[0]).toMatchObject({ isOpen: true, resultStatus: "pending" });
});

it("returns the calendar even if OpenF1 roster lookup fails", async () => {
    findAll.mockResolvedValue([{ id: 1, name: "France - Race", dateStart: new Date(), predictions: [] }]);
    const openf1 = { getSessions: jest.fn().mockRejectedValue(new Error("unavailable")) } as any;
    const result = await new WeekendsService(openf1).get(10);
    expect(result.drivers).toEqual([]);
    expect(result.sessions).toHaveLength(1);
});
