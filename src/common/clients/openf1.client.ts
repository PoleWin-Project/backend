const BASE_URL = "https://api.openf1.org/v1";

type QueryParams = Record<string, string | number | boolean | undefined>;

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

async function get<T>(path: string, params?: QueryParams, rawFilters?: string[]): Promise<T> {
    const url = buildUrl(path, params, rawFilters);
    const res = await fetch(url, {
        headers: { Accept: "application/json" },
    });

    if (!res.ok) {
        throw new Error(`OpenF1 API error ${res.status}: ${res.statusText} (${url})`);
    }

    return res.json() as Promise<T>;
}

export const openf1Client = { get };
