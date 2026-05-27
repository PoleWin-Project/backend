jest.mock("../../database/pg.client", () => ({
    getDbClient: jest.fn(),
}));

import { getHealth, dbCheck } from "./health.service";
import { getDbClient } from "../../database/pg.client";

const mockGetDbClient = getDbClient as jest.Mock;

describe("health.service — getHealth()", () => {
    it("retourne status ok", () => {
        const result = getHealth();
        expect(result.status).toBe("ok");
    });

    it("retourne le nom du service", () => {
        expect(getHealth().service).toBe("PoleWin API");
    });

    it("retourne la version v1", () => {
        expect(getHealth().version).toBe("v1");
    });

    it("retourne un uptime numérique >= 0", () => {
        expect(typeof getHealth().uptimeSec).toBe("number");
        expect(getHealth().uptimeSec).toBeGreaterThanOrEqual(0);
    });

    it("retourne les métriques mémoire en Mo", () => {
        const { memory } = getHealth();
        expect(typeof memory.heapUsedMb).toBe("number");
        expect(typeof memory.heapTotalMb).toBe("number");
        expect(typeof memory.rssMb).toBe("number");
        expect(memory.heapUsedMb).toBeGreaterThan(0);
    });

    it("retourne un timestamp ISO valide", () => {
        const { timestamp } = getHealth();
        expect(() => new Date(timestamp)).not.toThrow();
        expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
});

describe("health.service — dbCheck()", () => {
    it("retourne ok si le client répond", async () => {
        const fakeNow = new Date("2025-01-01");
        mockGetDbClient.mockReturnValue({
            query: jest.fn().mockResolvedValue({ rows: [{ now: fakeNow }] }),
        });

        const result = await dbCheck();

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.now).toBe(fakeNow);
    });

    it("retourne ok=false si pas de client", async () => {
        mockGetDbClient.mockReturnValue(null);

        const result = await dbCheck();

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBe("Database not connected");
    });

    it("retourne ok=false si la query échoue (avec message)", async () => {
        mockGetDbClient.mockReturnValue({
            query: jest.fn().mockRejectedValue(new Error("query failed")),
        });

        const result = await dbCheck();

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBe("query failed");
    });

    it("retourne ok=false avec fallback si l'erreur n'a pas de message", async () => {
        mockGetDbClient.mockReturnValue({
            query: jest.fn().mockRejectedValue("raw string error"),
        });

        const result = await dbCheck();

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBe("Database query failed");
    });
});
