import { Request, Response, NextFunction } from "express";
import { openf1Client } from "../../common/clients/openf1.client";
import { OpenF1Service } from "./openf1.service";

const service = new OpenF1Service();

// In-memory cache: full session data fetched once per process.
// Keyed by sessionKey. Avoids re-querying OpenF1 on every poll.
const sessionMeta = new Map<number, { raceStartMs: number; raceEndMs: number }>();
const locationsCache = new Map<number, any[]>();
const positionsCache = new Map<number, any[]>();
const warmingUp = new Set<number>();

function startBackgroundWarmup(sessionKey: number) {
    if (locationsCache.has(sessionKey) || warmingUp.has(sessionKey)) return;
    warmingUp.add(sessionKey);
    void (async () => {
        try {
            const meta = await getMeta(sessionKey);
            await Promise.all([
                getAllLocations(sessionKey, meta.raceStartMs, meta.raceEndMs),
                getAllPositions(sessionKey),
            ]);
        } finally {
            warmingUp.delete(sessionKey);
        }
    })();
}

async function getMeta(sessionKey: number) {
    const cached = sessionMeta.get(sessionKey);
    if (cached) return cached;
    const s = await service.getSessionByKey(sessionKey);
    if (!s) throw new Error(`Session ${sessionKey} not found on OpenF1`);
    const meta = {
        raceStartMs: new Date(s.date_start).getTime(),
        raceEndMs:   new Date(s.date_end).getTime(),
    };
    sessionMeta.set(sessionKey, meta);
    return meta;
}

async function getAllLocations(sessionKey: number, raceStartMs: number, raceEndMs: number) {
    const cached = locationsCache.get(sessionKey);
    if (cached) return cached;
    // /location is huge (~3.7Hz/driver). For Monaco 2024 race ~78 laps × 20 drivers
    // that's a lot of rows. We sample by pulling small windows to stay under quota.
    const raw: any[] = [];
    const chunkMs = 5 * 60 * 1000;
    for (let t = raceStartMs; t < raceEndMs; t += chunkMs) {
        const fromIso = new Date(t).toISOString();
        const toIso = new Date(Math.min(t + chunkMs, raceEndMs)).toISOString();
        const rows = await openf1Client.get<any[]>(
            "/location",
            { session_key: sessionKey },
            [`date>=${fromIso}`, `date<${toIso}`],
        );
        if (Array.isArray(rows)) raw.push(...rows);
    }
    // Index par driver: tableaux triés par date pour interpolation rapide.
    const byDriver = new Map<number, { tMs: number; x: number; y: number }[]>();
    for (const r of raw) {
        if (r.driver_number == null || r.x == null || r.y == null || !r.date) continue;
        const arr = byDriver.get(r.driver_number) ?? [];
        arr.push({ tMs: new Date(r.date).getTime(), x: r.x, y: r.y });
        byDriver.set(r.driver_number, arr);
    }
    for (const arr of byDriver.values()) arr.sort((a, b) => a.tMs - b.tMs);
    // On stocke directement la structure indexée (cast pour reste du flux).
    locationsCache.set(sessionKey, [byDriver] as any);
    return [byDriver] as any;
}

async function getAllPositions(sessionKey: number) {
    const cached = positionsCache.get(sessionKey);
    if (cached) return cached;
    const rows = await openf1Client.get<any[]>("/position", { session_key: sessionKey });
    const safe = Array.isArray(rows) ? rows : [];
    positionsCache.set(sessionKey, safe);
    return safe;
}

function computeVirtualNowMs(
    startedAtIso: string,
    durationSec: number,
    raceStartMs: number,
    raceEndMs: number,
): number {
    const compressedElapsedMs = Date.now() - new Date(startedAtIso).getTime();
    const progress = Math.max(0, Math.min(1, compressedElapsedMs / (durationSec * 1000)));
    return raceStartMs + progress * (raceEndMs - raceStartMs);
}

/** Position interpolée linéairement à un temps t entre deux samples voisins. */
function sampleAt(
    arr: { tMs: number; x: number; y: number }[],
    tMs: number,
): { x: number; y: number } | null {
    if (arr.length === 0) return null;
    if (tMs <= arr[0].tMs) return { x: arr[0].x, y: arr[0].y };
    if (tMs >= arr[arr.length - 1].tMs) {
        const last = arr[arr.length - 1];
        return { x: last.x, y: last.y };
    }
    let lo = 0, hi = arr.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (arr[mid].tMs <= tMs) lo = mid;
        else hi = mid;
    }
    const a = arr[lo];
    const b = arr[hi];
    const denom = b.tMs - a.tMs || 1;
    const u = (tMs - a.tMs) / denom;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** Downsample uniforme. */
function downsample<T>(arr: T[], n: number): T[] {
    if (arr.length <= n) return arr;
    const out: T[] = [];
    const step = (arr.length - 1) / (n - 1);
    for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
    return out;
}

export async function demoWarmup(req: Request, res: Response, next: NextFunction) {
    try {
        const sessionKey = Number(req.params.sessionKey);
        const ready = locationsCache.has(sessionKey) && positionsCache.has(sessionKey);
        if (!ready) startBackgroundWarmup(sessionKey);
        res.json({
            status: "ok",
            ready,
            warming: warmingUp.has(sessionKey),
            locationsCached: locationsCache.has(sessionKey),
            positionsCached: positionsCache.has(sessionKey),
        });
    } catch (e) {
        next(e);
    }
}

export async function demoLocations(req: Request, res: Response, next: NextFunction) {
    try {
        const sessionKey = Number(req.params.sessionKey);
        const startedAt = String(req.query.startedAt ?? "");
        const durationSec = Number(req.query.durationSec ?? 180);
        if (!startedAt) {
            res.status(400).json({ status: "error", message: "startedAt query required" });
            return;
        }

        // Si le cache n'est pas prêt, on déclenche un warmup et on renvoie une réponse vide.
        if (!locationsCache.has(sessionKey)) {
            startBackgroundWarmup(sessionKey);
            res.json({ status: "ok", locations: [], warming: true });
            return;
        }

        const { raceStartMs, raceEndMs } = await getMeta(sessionKey);
        const virtualNowMs = computeVirtualNowMs(startedAt, durationSec, raceStartMs, raceEndMs);
        const frameMs = Math.max(60, Math.min(2000, Number(req.query.frameMs ?? 400)));
        const realDurationMs = raceEndMs - raceStartMs;
        const speed = realDurationMs / (durationSec * 1000);
        // Fenêtre de course virtuelle que représente une frame du client.
        const virtualFrameSpanMs = frameMs * speed;
        const fromMs = virtualNowMs - virtualFrameSpanMs;

        const cached = await getAllLocations(sessionKey, raceStartMs, raceEndMs);
        const byDriver: Map<number, { tMs: number; x: number; y: number }[]> = (cached as any)[0];

        // Pour chaque pilote on retourne une polyligne de waypoints (positions
        // OpenF1 réelles) entre `fromMs` et `virtualNowMs`. Le frontend
        // animera linéairement entre waypoints consécutifs → trajectoire
        // qui SUIT le circuit au lieu de couper en ligne droite.
        const MAX_WAYPOINTS = 40;
        const out: { driver_number: number; path: { x: number; y: number }[] }[] = [];

        for (const [driverNumber, arr] of byDriver.entries()) {
            if (arr.length === 0) continue;

            // Position au temps fromMs (point de départ)
            const startPos = sampleAt(arr, fromMs);
            // Position au temps virtualNowMs (point d'arrivée)
            const endPos = sampleAt(arr, virtualNowMs);
            if (!startPos || !endPos) continue;

            // Samples bruts dans la fenêtre
            const within: { x: number; y: number }[] = [];
            // Recherche du premier index dont tMs >= fromMs via dichotomie
            let lo = 0, hi = arr.length;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (arr[mid].tMs < fromMs) lo = mid + 1;
                else hi = mid;
            }
            for (let i = lo; i < arr.length && arr[i].tMs <= virtualNowMs; i++) {
                within.push({ x: arr[i].x, y: arr[i].y });
            }

            // Compose path: start → ...samples... → end, downsamplé à MAX_WAYPOINTS
            const composed = [startPos, ...within, endPos];
            const path =
                composed.length <= MAX_WAYPOINTS
                    ? composed
                    : downsample(composed, MAX_WAYPOINTS);

            out.push({ driver_number: driverNumber, path });
        }

        res.json({ status: "ok", locations: out });
    } catch (e) {
        next(e);
    }
}

export async function demoPositions(req: Request, res: Response, next: NextFunction) {
    try {
        const sessionKey = Number(req.params.sessionKey);
        const startedAt = String(req.query.startedAt ?? "");
        const durationSec = Number(req.query.durationSec ?? 180);
        if (!startedAt) {
            res.status(400).json({ status: "error", message: "startedAt query required" });
            return;
        }

        if (!positionsCache.has(sessionKey)) {
            startBackgroundWarmup(sessionKey);
            res.json({ status: "ok", positions: [], warming: true });
            return;
        }

        const { raceStartMs, raceEndMs } = await getMeta(sessionKey);
        const virtualNowMs = computeVirtualNowMs(startedAt, durationSec, raceStartMs, raceEndMs);

        const all = await getAllPositions(sessionKey);
        const latest = new Map<number, any>();
        for (const p of all) {
            if (!p.position || !p.driver_number) continue;
            const t = new Date(p.date).getTime();
            if (t > virtualNowMs) continue;
            const cur = latest.get(p.driver_number);
            if (!cur || t > new Date(cur.date).getTime()) latest.set(p.driver_number, p);
        }

        const sorted = [...latest.values()].sort((a, b) => a.position - b.position);
        res.json({ status: "ok", positions: sorted });
    } catch (e) {
        next(e);
    }
}
