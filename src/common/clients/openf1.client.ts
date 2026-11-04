import { env } from "../../config/env";
import { logger } from "../../config/logger";

const BASE_URL = "https://api.openf1.org/v1";
const TOKEN_URL = "https://api.openf1.org/token";

type QueryParams = Record<string, string | number | boolean | undefined>;

// ── OAuth2 token cache ────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string | null> {
    if (!env.openf1Username || !env.openf1Password) return null;

    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) {
        return cachedToken;
    }

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            username: env.openf1Username,
            password: env.openf1Password,
        }),
        signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
        logger.warn({ status: res.status }, "[OpenF1] Auth failed — continuing without token (API may be locked during live session).");
        return null;
    }

    const data = await res.json() as { access_token: string; expires_in: string };
    cachedToken = data.access_token;
    tokenExpiresAt = now + Number(data.expires_in) * 1000;
    logger.info({ expiresAt: new Date(tokenExpiresAt).toISOString() }, "[OpenF1] Token refreshed");
    return cachedToken;
}

function buildUrl(path: string, params?: QueryParams, rawFilters?: string[]): string {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }
    }
    const base = url.toString();
    if (rawFilters?.length) {
        const sep = base.includes("?") ? "&" : "?";
        return base + sep + rawFilters.join("&");
    }
    return base;
}

// ── Cache des réponses (5 min par défaut, durée ajustable) ───────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<string, { data: unknown; cachedAt: number; expiresAt: number }>();
const requestsInFlight = new Map<string, Promise<unknown>>();

function getCached<T>(key: string, maxAgeMs?: number): T | null {
    const entry = responseCache.get(key);
    const now = Date.now();
    if (entry && now < entry.expiresAt && (maxAgeMs === undefined || now - entry.cachedAt < maxAgeMs)) {
        return entry.data as T;
    }
    // Une entrée trop ancienne pour cet appel peut rester valable pour un autre
    // usage moins sensible. On ne la supprime que lorsqu'elle est vraiment expirée.
    if (entry && now >= entry.expiresAt) responseCache.delete(key);
    return null;
}

function setCache(key: string, data: unknown, ttlMs = CACHE_TTL_MS): void {
    const now = Date.now();
    responseCache.set(key, { data, cachedAt: now, expiresAt: now + ttlMs });
}

// ── HTTP client ───────────────────────────────────────────────────────────────

interface GetOptions {
    noCache?: boolean;
    /** Durée maximale acceptée et durée de stockage de cette réponse. */
    cacheTtlMs?: number;
    /** Ignore la valeur en cache, mais mémorise la nouvelle réponse. */
    forceRefresh?: boolean;
}

async function get<T>(path: string, params?: QueryParams, rawFilters?: string[], options?: GetOptions): Promise<T> {
    const url = buildUrl(path, params, rawFilters);

    if (!options?.noCache && !options?.forceRefresh) {
        const cached = getCached<T>(url, options?.cacheTtlMs);
        if (cached) {
            logger.debug({ url }, "[OpenF1] Cache hit");
            return cached;
        }
    }

    // Plusieurs téléphones peuvent demander la même grille au même instant.
    // Une seule requête OpenF1 est exécutée, les autres partagent sa promesse.
    const pending = requestsInFlight.get(url);
    if (pending) return pending as Promise<T>;

    const request = (async () => {
        const token = await getAccessToken();
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(url, { headers, signal: AbortSignal.timeout(4_000) });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                logger.warn({ url }, "[OpenF1] API locked (live session in progress). Returning empty result gracefully.");
                return [] as unknown as T;
            }
            throw new Error(`OpenF1 API error ${res.status}: ${res.statusText} (${url})`);
        }

        const data = await res.json() as T;
        if (!options?.noCache) {
            setCache(url, data, options?.cacheTtlMs);
            logger.debug({ url }, "[OpenF1] Cached response");
        }
        return data;
    })();
    requestsInFlight.set(url, request);

    try {
        return await request;
    } catch (error) {
        logger.error({ url, error: error instanceof Error ? error.message : String(error) }, "[OpenF1] Request failed");
        throw error;
    } finally {
        if (requestsInFlight.get(url) === request) requestsInFlight.delete(url);
    }
}

export const openf1Client = { get };
