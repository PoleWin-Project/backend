jest.mock("../../common/clients/openf1.client", () => ({
    openf1Client: { get: jest.fn() },
}));

import { openf1Client } from "../../common/clients/openf1.client";
import { autoResolve } from "./predictions.autoresolve";

const get = openf1Client.get as jest.Mock;

beforeEach(() => get.mockReset());

it("waits until the session ends before reading the result", async () => {
    get.mockResolvedValueOnce([{ date_end: new Date(Date.now() + 60_000).toISOString() }]);
    await expect(autoResolve("RACE_WINNER", 42)).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
});

it("uses the published session result rather than live positions", async () => {
    get.mockResolvedValueOnce([{ date_end: new Date(Date.now() - 60_000).toISOString() }]);
    get.mockResolvedValueOnce([{ position: 1, driver_number: 16, dsq: false }]);
    get.mockResolvedValueOnce([{ driver_number: 16, name_acronym: "LEC" }]);
    await expect(autoResolve("RACE_WINNER", 42)).resolves.toBe("LEC");
    expect(get.mock.calls[1][0]).toBe("/session_result");
    expect(get.mock.calls[1][3]).toEqual({ noCache: true });
});

it("does not resolve when the official result has not appeared", async () => {
    get.mockResolvedValueOnce([{ date_end: new Date(Date.now() - 60_000).toISOString() }]);
    get.mockResolvedValueOnce([]);
    await expect(autoResolve("POLE_POSITION", 42)).resolves.toBeNull();
});
