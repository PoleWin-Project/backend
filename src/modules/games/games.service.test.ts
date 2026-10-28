jest.mock("../../database/sequelize", () => ({
    sequelize: { transaction: jest.fn((cb: (tx: object) => unknown) => cb({ LOCK: { UPDATE: "UPDATE" } })) },
}));
jest.mock("../../database/models", () => ({
    GamePlayModel: { count: jest.fn(), create: jest.fn() },
    ProfileModel: { findOne: jest.fn() },
}));

import { GamePlayModel, ProfileModel } from "../../database/models";
import { GamesService } from "./games.service";

const count = GamePlayModel.count as jest.Mock;
const create = GamePlayModel.create as jest.Mock;
const findProfile = ProfileModel.findOne as jest.Mock;

beforeEach(() => {
    count.mockReset();
    create.mockReset();
    findProfile.mockReset();
});

it("rejects arbitrary game IDs and rewards", async () => {
    const service = new GamesService();
    await expect(service.rewardUser(1, 50, "arbitrary", false)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.rewardUser(1, 100, "reaction", false)).rejects.toMatchObject({ statusCode: 400 });
    expect(findProfile).not.toHaveBeenCalled();
});

it("checks the daily limit after locking the balance", async () => {
    findProfile.mockResolvedValue({ points: 500, update: jest.fn() });
    count.mockResolvedValue(3);
    await expect(new GamesService().rewardUser(1, 20, "reaction", false)).rejects.toMatchObject({ statusCode: 403 });
    expect(findProfile).toHaveBeenCalledWith(expect.objectContaining({ lock: "UPDATE" }));
    expect(create).not.toHaveBeenCalled();
});

it("credits points and records a play in one transaction", async () => {
    const profile = {
        points: 500,
        update: jest.fn(async ({ points }: { points: number }) => { profile.points = points; }),
    };
    findProfile.mockResolvedValue(profile);
    count.mockResolvedValue(0);
    create.mockResolvedValue({});

    const result = await new GamesService().rewardUser(1, 20, "reaction", false);

    expect(profile.update).toHaveBeenCalledWith({ points: 520 }, { transaction: expect.any(Object) });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ gameId: "reaction", points: 20 }), { transaction: expect.any(Object) });
    expect(result).toMatchObject({ newTotal: 520, playsToday: 1 });
});
