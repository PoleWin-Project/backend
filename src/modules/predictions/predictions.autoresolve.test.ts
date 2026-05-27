jest.mock("../../common/clients/openf1.client", () => ({
    openf1Client: { get: jest.fn() },
}));

import { autoResolve, isWinnerForType } from "./predictions.autoresolve";
import { openf1Client } from "../../common/clients/openf1.client";

const mockGet = openf1Client.get as jest.Mock;

describe("isWinnerForType", () => {
    it("retourne true si la valeur correspond (insensible à la casse)", () => {
        expect(isWinnerForType("RACE_WINNER", "ver", "VER")).toBe(true);
        expect(isWinnerForType("RACE_WINNER", " VER ", " VER ")).toBe(true);
    });

    it("retourne false si la valeur ne correspond pas", () => {
        expect(isWinnerForType("RACE_WINNER", "LEC", "VER")).toBe(false);
    });
});

describe("autoResolve", () => {
    const fakePositions = [
        { driver_number: 1, position: 1, date: "2025-01-01T14:00:00" },
        { driver_number: 2, position: 2, date: "2025-01-01T14:00:00" },
    ];

    const fakeDrivers = [
        { driver_number: 1, name_acronym: "VER" },
        { driver_number: 2, name_acronym: "LEC" },
    ];

    beforeEach(() => {
        mockGet.mockReset();
    });

    it("retourne l'acronyme du pilote P1 pour RACE_WINNER", async () => {
        mockGet
            .mockResolvedValueOnce(fakePositions) // /position
            .mockResolvedValueOnce(fakeDrivers);  // /drivers

        const result = await autoResolve("RACE_WINNER", 9000);
        expect(result).toBe("VER");
    });

    it("retourne l'acronyme du pilote P1 pour POLE_POSITION", async () => {
        mockGet
            .mockResolvedValueOnce(fakePositions)
            .mockResolvedValueOnce(fakeDrivers);

        const result = await autoResolve("POLE_POSITION", 9000);
        expect(result).toBe("VER");
    });

    it("retourne l'acronyme du pilote P1 pour SPRINT_WINNER", async () => {
        mockGet
            .mockResolvedValueOnce(fakePositions)
            .mockResolvedValueOnce(fakeDrivers);

        const result = await autoResolve("SPRINT_WINNER", 9000);
        expect(result).toBe("VER");
    });

    it("retourne null si aucun pilote en P1", async () => {
        mockGet
            .mockResolvedValueOnce([{ driver_number: 1, position: 2, date: "2025-01-01" }])
            .mockResolvedValueOnce(fakeDrivers);

        const result = await autoResolve("RACE_WINNER", 9000);
        expect(result).toBeNull();
    });

    it("retourne null si le numéro du pilote P1 est inconnu", async () => {
        mockGet
            .mockResolvedValueOnce([{ driver_number: 99, position: 1, date: "2025-01-01" }])
            .mockResolvedValueOnce(fakeDrivers); // 99 not in drivers

        const result = await autoResolve("RACE_WINNER", 9000);
        expect(result).toBeNull();
    });

    it("retourne null en cas d'erreur réseau", async () => {
        mockGet.mockRejectedValue(new Error("network error"));

        const result = await autoResolve("RACE_WINNER", 9000);
        expect(result).toBeNull();
    });

    it("prend la position la plus récente par pilote", async () => {
        const positions = [
            { driver_number: 1, position: 2, date: "2025-01-01T13:00:00" },
            { driver_number: 1, position: 1, date: "2025-01-01T14:00:00" }, // plus récent
        ];
        mockGet
            .mockResolvedValueOnce(positions)
            .mockResolvedValueOnce(fakeDrivers);

        const result = await autoResolve("RACE_WINNER", 9000);
        expect(result).toBe("VER");
    });

    it("garde la position existante si elle est plus récente", async () => {
        const positions = [
            { driver_number: 1, position: 1, date: "2025-01-01T14:00:00" }, // plus récent — garde celui-là
            { driver_number: 1, position: 2, date: "2025-01-01T13:00:00" }, // plus ancien — ignoré
        ];
        mockGet
            .mockResolvedValueOnce(positions)
            .mockResolvedValueOnce(fakeDrivers);

        const result = await autoResolve("RACE_WINNER", 9000);
        expect(result).toBe("VER"); // driver 1 reste en position 1
    });
});
