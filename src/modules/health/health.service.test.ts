import { getHealth } from "./health.service";

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
