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
    // Simpler: pull 5-minute chunks of the real race and concatenate.
    const all: any[] = [];
    const chunkMs = 5 * 60 * 1000;
    for (let t = raceStartMs; t < raceEndMs; t += chunkMs) {
        const fromIso = new Date(t).toISOString();
        const toIso = new Date(Math.min(t + chunkMs, raceEndMs)).toISOString();
        const rows = await openf1Client.get<any[]>(
            "/location",
            { session_key: sessionKey },
            [`date>=${fromIso}`, `date<${toIso}`],
        );
        if (Array.isArray(rows)) all.push(...rows);
    }
    locationsCache.set(sessionKey, all);
    return all;
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

        const all = await getAllLocations(sessionKey, raceStartMs, raceEndMs);
        // Sample window: take the last "virtual 6 seconds" worth of points before virtualNow.
        const realDurationMs = raceEndMs - raceStartMs;
        const speed = realDurationMs / (durationSec * 1000);
        const windowMs = 6_000 * speed;
        const fromMs = virtualNowMs - windowMs;

        const latest = new Map<number, any>();
        for (const p of all) {
            const t = new Date(p.date).getTime();
            if (t > virtualNowMs || t < fromMs) continue;
            const cur = latest.get(p.driver_number);
            if (!cur || t > new Date(cur.date).getTime()) latest.set(p.driver_number, p);
        }

        res.json({ status: "ok", locations: [...latest.values()] });
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
