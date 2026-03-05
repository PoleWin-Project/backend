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

// ── HTTP client ───────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: QueryParams, rawFilters?: string[]): Promise<T> {
    const url     = buildUrl(path, params, rawFilters);
    const token   = await getAccessToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });

    if (!res.ok) {
        throw new Error(`OpenF1 API error ${res.status}: ${res.statusText} (${url})`);
    }

    return res.json() as Promise<T>;
}

export const openf1Client = { get };
