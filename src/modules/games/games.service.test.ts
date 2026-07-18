jest.mock("../../database/sequelize", () => ({
    sequelize: { query: jest.fn(), transaction: jest.fn() },
}));
jest.mock("../../database/models", () => ({
    GamePlayModel: { count: jest.fn(), create: jest.fn() },
    ProfileModel:  { findOne: jest.fn() },
}));

import { GamesService } from "./games.service";
import { sequelize } from "../../database/sequelize";

const queryMock = sequelize.query as jest.Mock;

describe("GamesService.getLeaderboard", () => {
    it("trie par metricMs ascendant — moins d'essais = mieux classé", async () => {
        const rows = [
            { userId: 1, displayName: "Alice", avatarUrl: null, bestMs: 1 }, // 1 essai
            { userId: 2, displayName: "Bob",   avatarUrl: null, bestMs: 3 }, // 3 essais
            { userId: 3, displayName: "Cara",  avatarUrl: null, bestMs: 5 }, // 5 essais
        ];
        queryMock.mockResolvedValueOnce(rows);

        const svc = new GamesService();
        const { entries } = await svc.getLeaderboard("driver-dle", 1);

        // La requête SQL ordonne explicitement par "bestMs" ASC.
        const sql = String(queryMock.mock.calls[0][0]);
        expect(sql).toMatch(/ORDER BY\s+"bestMs"\s+ASC/);

        // Le premier classé a le plus petit nombre d'essais.
        expect(entries[0].rank).toBe(1);
        expect(entries[0].bestMs).toBe(1);
        expect(entries[1].bestMs).toBe(3);
        expect(entries[2].bestMs).toBe(5);
        expect(entries[0].bestMs).toBeLessThan(entries[1].bestMs);
    });
});
