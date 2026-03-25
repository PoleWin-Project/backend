import { env } from "../../config/env";
import { logger } from "../../config/logger";

const BASE_URL  = "https://api.openf1.org/v1";
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
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    new URLSearchParams({
            username: env.openf1Username,
            password: env.openf1Password,
        }),
        signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
        throw new Error(`OpenF1 auth error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json() as { access_token: string; expires_in: string };
    cachedToken    = data.access_token;
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

// ── Response cache (5 min TTL) ────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
    const entry = responseCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
        return entry.data as T;
    }
    if (entry) responseCache.delete(key);
    return null;
}

function setCache(key: string, data: unknown): void {
    responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── HTTP client ───────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: QueryParams, rawFilters?: string[]): Promise<T> {
    const url     = buildUrl(path, params, rawFilters);

    const cached = getCached<T>(url);
    if (cached) {
        logger.debug({ url }, "[OpenF1] Cache hit");
        return cached;
    }

    const token   = await getAccessToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });

    if (!res.ok) {
        throw new Error(`OpenF1 API error ${res.status}: ${res.statusText} (${url})`);
    }

    const data = await res.json() as T;
    setCache(url, data);
    logger.debug({ url }, "[OpenF1] Cached response");
    return data;
}

export const openf1Client = { get };

