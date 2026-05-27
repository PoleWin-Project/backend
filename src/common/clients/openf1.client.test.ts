// Mock env WITHOUT credentials → getAccessToken retourne null immédiatement (pas de fetch token)
jest.mock("../../config/env", () => ({
    env: { openf1Username: undefined, openf1Password: undefined },
}));

jest.mock("../../config/logger", () => ({
    logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

import { openf1Client } from "./openf1.client";

beforeEach(() => {
    mockFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200) {
    return {
        ok:         status < 400,
        status,
        statusText: status < 400 ? "OK" : "Error",
        json:       jest.fn().mockResolvedValue(body),
    };
}

describe("openf1Client.get", () => {
    it("effectue une requête GET et retourne les données", async () => {
        mockFetch.mockResolvedValue(jsonResponse([{ driver_number: 1 }]));

        const result = await openf1Client.get<any[]>("/drivers");

        expect(result).toEqual([{ driver_number: 1 }]);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("construit l'URL avec des paramètres query", async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));

        await openf1Client.get("/drivers", { session_key: 9000 }, undefined, { noCache: true });

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("session_key=9000");
    });

    it("construit l'URL avec rawFilters", async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));

        await openf1Client.get("/position", {}, ["date>2025-01-01"], { noCache: true });

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("date>2025-01-01");
    });

    it("retourne [] si l'API répond 401 (session live en cours)", async () => {
        mockFetch.mockResolvedValue(jsonResponse(null, 401));

        const result = await openf1Client.get("/drivers", undefined, undefined, { noCache: true });

        expect(result).toEqual([]);
    });

    it("retourne [] si l'API répond 403 (session live en cours)", async () => {
        mockFetch.mockResolvedValue(jsonResponse(null, 403));

        const result = await openf1Client.get("/positions", undefined, undefined, { noCache: true });

        expect(result).toEqual([]);
    });

    it("throw une erreur si l'API répond 5xx", async () => {
        mockFetch.mockResolvedValue(jsonResponse(null, 503));

        await expect(
            openf1Client.get("/drivers", undefined, undefined, { noCache: true }),
        ).rejects.toThrow("503");
    });

    it("throw si la requête réseau échoue", async () => {
        mockFetch.mockRejectedValue(new Error("network error"));

        await expect(
            openf1Client.get("/drivers", undefined, undefined, { noCache: true }),
        ).rejects.toThrow("network error");
    });

    it("utilise le cache en deuxième appel identique", async () => {
        mockFetch.mockResolvedValue(jsonResponse([{ id: 1 }]));

        const r1 = await openf1Client.get<any[]>("/drivers/cached-test");
        const r2 = await openf1Client.get<any[]>("/drivers/cached-test");

        expect(r1).toEqual([{ id: 1 }]);
        expect(r2).toEqual([{ id: 1 }]);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("noCache — ignore le cache et refait la requête", async () => {
        mockFetch
            .mockResolvedValueOnce(jsonResponse([{ id: 1 }]))
            .mockResolvedValueOnce(jsonResponse([{ id: 2 }]));

        const r1 = await openf1Client.get<any[]>("/laps/nocache-test", undefined, undefined, { noCache: true });
        const r2 = await openf1Client.get<any[]>("/laps/nocache-test", undefined, undefined, { noCache: true });

        expect(r1).toEqual([{ id: 1 }]);
        expect(r2).toEqual([{ id: 2 }]);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("ignore les paramètres undefined dans l'URL", async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));

        await openf1Client.get("/drivers", { session_key: undefined }, undefined, { noCache: true });

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).not.toContain("session_key");
    });

    it("ajoute rawFilters avec '&' si l'URL a déjà des paramètres query", async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));

        await openf1Client.get("/position", { session_key: 9000 }, ["date>2025-01-01"], { noCache: true });

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("session_key=9000");
        expect(calledUrl).toContain("&date>2025-01-01");
    });

    it("supprime l'entrée expirée du cache et refait la requête", async () => {
        mockFetch
            .mockResolvedValueOnce(jsonResponse([{ id: 10 }]))
            .mockResolvedValueOnce(jsonResponse([{ id: 20 }]));

        const r1 = await openf1Client.get<any[]>("/expire-cache-test-unique-path");
        expect(r1).toEqual([{ id: 10 }]);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Advance Date.now() past the 5-minute TTL so the cache entry is stale
        const future = Date.now() + 6 * 60 * 1000;
        const spy = jest.spyOn(Date, "now").mockReturnValue(future);

        try {
            const r2 = await openf1Client.get<any[]>("/expire-cache-test-unique-path");
            expect(r2).toEqual([{ id: 20 }]);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        } finally {
            spy.mockRestore();
        }
    });

    it("logue String(error) si l'erreur n'est pas une instance d'Error", async () => {
        mockFetch.mockRejectedValue("plain string error");

        await expect(
            openf1Client.get("/drivers", undefined, undefined, { noCache: true }),
        ).rejects.toBe("plain string error");
    });
});

// ── Tests d'auth (avec credentials) ─────────────────────────────────────────

describe("openf1Client.get — avec credentials", () => {
    it("inclut le token Bearer dans les headers si l'auth réussit", async () => {
        jest.resetModules();
        jest.doMock("../../config/env", () => ({
            env: { openf1Username: "test@test.com", openf1Password: "pass" },
        }));
        jest.doMock("../../config/logger", () => ({
            logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
        }));

        mockFetch
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: jest.fn().mockResolvedValue({ access_token: "mytoken", expires_in: "3600" }),
            })
            .mockResolvedValueOnce(jsonResponse([{ id: 99 }]));

        const { openf1Client: client } = await import("./openf1.client");
        const result = await client.get<any[]>("/meetings-auth", undefined, undefined, { noCache: true });

        expect(result).toEqual([{ id: 99 }]);
        const headers = mockFetch.mock.calls[1][1]?.headers as Record<string, string>;
        expect(headers["Authorization"]).toBe("Bearer mytoken");
    });

    it("continue sans token si l'auth échoue (warn)", async () => {
        jest.resetModules();
        jest.doMock("../../config/env", () => ({
            env: { openf1Username: "test@test.com", openf1Password: "pass" },
        }));
        jest.doMock("../../config/logger", () => ({
            logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
        }));

        mockFetch
            .mockResolvedValueOnce({ ok: false, status: 503, statusText: "Unavailable", json: jest.fn() })
            .mockResolvedValueOnce(jsonResponse([{ id: 50 }]));

        const { openf1Client: client } = await import("./openf1.client");
        const result = await client.get<any[]>("/races-auth", undefined, undefined, { noCache: true });

        expect(result).toEqual([{ id: 50 }]);
    });

    it("utilise le token en cache si encore valide (pas de nouveau fetch token)", async () => {
        jest.resetModules();
        jest.doMock("../../config/env", () => ({
            env: { openf1Username: "test@test.com", openf1Password: "pass" },
        }));
        jest.doMock("../../config/logger", () => ({
            logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
        }));

        // 1 token fetch + 2 data fetches (second call reuses cached token)
        mockFetch
            .mockResolvedValueOnce({
                ok: true, status: 200,
                json: jest.fn().mockResolvedValue({ access_token: "cached_token", expires_in: "3600" }),
            })
            .mockResolvedValueOnce(jsonResponse([{ id: 1 }]))
            .mockResolvedValueOnce(jsonResponse([{ id: 2 }]));

        const { openf1Client: client } = await import("./openf1.client");

        // First call: fetches token + data (2 fetches)
        await client.get<any[]>("/session-a", undefined, undefined, { noCache: true });
        // Second call: token still cached, only data fetch (1 fetch)
        await client.get<any[]>("/session-b", undefined, undefined, { noCache: true });

        // Total: 1 token + 2 data = 3 fetches
        expect(mockFetch).toHaveBeenCalledTimes(3);
    });
});
