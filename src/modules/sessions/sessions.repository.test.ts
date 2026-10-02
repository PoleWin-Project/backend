import { SessionsRepository } from "./sessions.repository";
import { PredictionModel, RaceSessionModel } from "../../database/models";
import { OpenF1Session } from "../openf1/openf1.types";

jest.mock("../../database/models", () => ({
    RaceSessionModel: { findOrCreate: jest.fn() },
    PredictionModel: { update: jest.fn(), findOrCreate: jest.fn() },
}));
jest.mock("../../database/sequelize", () => ({
    sequelize: { transaction: jest.fn(async (fn) => fn({ transaction: true })) },
}));

const source = (name = "Race", start = "2099-04-12T15:00:00Z") => ({
    session_key: 42, country_name: "Bahrain", location: "Sakhir",
    session_name: name, date_start: start,
} as OpenF1Session);

describe("calendar synchronization", () => {
    const update = jest.fn();
    beforeEach(() => {
        (RaceSessionModel.findOrCreate as jest.Mock).mockResolvedValue([{ id: 7, update }, false]);
        (PredictionModel.findOrCreate as jest.Mock).mockResolvedValue([{ id: 9 }, false]);
    });

    it("reschedules an existing GP without replacing session or prediction IDs", async () => {
        const result = await new SessionsRepository().upsertFromOpenF1([source()]);
        expect(RaceSessionModel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
            where: { idCourseExternal: 42 },
        }));
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            name: "Bahrain - Race", location: "Sakhir", dateStart: new Date(source().date_start),
        }), expect.anything());
        expect(PredictionModel.update).toHaveBeenCalledWith({ closesAt: new Date(source().date_start) },
            expect.objectContaining({ where: { sessionId: 7, winningValue: null } }));
        expect(PredictionModel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
            where: { sessionId: 7, type: "RACE_WINNER" },
        }));
        expect(result).toEqual({ created: 0, updated: 1, predictionsCreated: 0 });
    });

    it.each([
        ["Qualifying", "POLE_POSITION"], ["Sprint", "SPRINT_WINNER"], ["Race", "RACE_WINNER"],
    ])("creates missing markets for %s", async (name, type) => {
        (RaceSessionModel.findOrCreate as jest.Mock).mockResolvedValue([{ id: 7 }, true]);
        (PredictionModel.findOrCreate as jest.Mock).mockResolvedValue([{ id: 9 }, true]);
        const result = await new SessionsRepository().upsertFromOpenF1([source(name)]);
        expect(PredictionModel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
            where: { sessionId: 7, type },
        }));
        expect(result.predictionsCreated).toBe(1);
    });

    it.each(["Practice 1", "Sprint Qualifying", "Sprint Shootout"])("does not create markets for %s", async name => {
        await new SessionsRepository().upsertFromOpenF1([source(name)]);
        expect(PredictionModel.findOrCreate).not.toHaveBeenCalled();
    });

    it("does not create new markets for completed sessions", async () => {
        await new SessionsRepository().upsertFromOpenF1([source("Race", "2020-04-12T15:00:00Z")]);
        expect(PredictionModel.findOrCreate).not.toHaveBeenCalled();
    });
});
