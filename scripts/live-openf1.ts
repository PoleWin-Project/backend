/**
 * 🏎️ Live OpenF1 Data Feed — China Qualifying (session_key: 11241)
 *
 * Usage:
 *   ./node_modules/.bin/ts-node scripts/live-openf1.ts
 *
 * Ctrl+C pour arrêter.
 */

import "dotenv/config";

const BASE_URL  = "https://api.openf1.org/v1";
const TOKEN_URL = "https://api.openf1.org/token";
const SESSION_KEY = "11241";

const USERNAME = process.env.OPENF1_USERNAME;
const PASSWORD = process.env.OPENF1_PASSWORD;

const POLL_INTERVAL = {
    positions:   3_000,
    laps:        5_000,
    raceControl: 3_000,
};

// ── Auth ──────────────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string | null> {
    if (!USERNAME || !PASSWORD) return null;

    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: USERNAME, password: PASSWORD }),
    });

    if (!res.ok) throw new Error(`Auth failed (${res.status})`);

    const data = await res.json() as { access_token: string; expires_in: string };
    cachedToken = data.access_token;
    tokenExpiresAt = now + Number(data.expires_in) * 1000;
    return cachedToken;
}

async function api<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const token = await getToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
    return res.json() as Promise<T>;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function clearScreen() {
    process.stdout.write("\x1B[2J\x1B[0f");
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatLapDuration(seconds: number | null): string {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, "0")}` : `${secs}s`;
}

function colorFlag(flag: string): string {
    const colors: Record<string, string> = {
        GREEN:         "\x1b[42m\x1b[30m",
        YELLOW:        "\x1b[43m\x1b[30m",
        "DOUBLE YELLOW": "\x1b[43m\x1b[31m",
        RED:           "\x1b[41m\x1b[37m",
        CLEAR:         "\x1b[47m\x1b[30m",
        CHEQUERED:     "\x1b[100m\x1b[37m",
    };
    const c = colors[flag] ?? "\x1b[0m";
    return `${c} ${flag} \x1b[0m`;
}

// ── State ─────────────────────────────────────────────────────────────────────

interface DriverInfo {
    driver_number: number;
    first_name: string;
    last_name: string;
    name_acronym: string;
    team_name: string;
    team_colour: string;
}

interface Position {
    driver_number: number;
    position: number;
    date: string;
}

interface Lap {
    driver_number: number;
    lap_number: number;
    lap_duration: number | null;
    duration_sector_1: number | null;
    duration_sector_2: number | null;
    duration_sector_3: number | null;
    is_pit_out_lap: boolean;
    date_start: string;
}

interface RaceControlEvent {
    date: string;
    category: string;
    flag: string | null;
    message: string;
    driver_number: number | null;
}

let drivers     = new Map<number, DriverInfo>();
let positions   = new Map<number, Position>();
let bestLaps    = new Map<number, Lap>();
let rcEvents: RaceControlEvent[] = [];
let lastRcDate: string | null = null;
let lastLapDate: string | null = null;

// ── Pollers ───────────────────────────────────────────────────────────────────

async function loadDrivers() {
    const data = await api<DriverInfo[]>("/drivers", { session_key: SESSION_KEY });
    for (const d of data) drivers.set(d.driver_number, d);
}

async function pollPositions() {
    try {
        const data = await api<Position[]>("/position", { session_key: SESSION_KEY });
        const latest = new Map<number, Position>();
        for (const p of data) latest.set(p.driver_number, p);
        positions = latest;
    } catch { /* silently retry next cycle */ }
}

async function pollLaps() {
    try {
        const params: Record<string, string> = { session_key: SESSION_KEY };
        if (lastLapDate) params["date_start>"] = lastLapDate;

        const data = await api<Lap[]>("/laps", params);
        for (const lap of data) {
            const prev = bestLaps.get(lap.driver_number);
            if (!prev || (lap.lap_duration && (!prev.lap_duration || lap.lap_duration < prev.lap_duration))) {
                bestLaps.set(lap.driver_number, lap);
            }
        }
        if (data.length > 0) {
            lastLapDate = data[data.length - 1].date_start;
        }
    } catch { /* silently retry */ }
}

async function pollRaceControl() {
    try {
        const params: Record<string, string> = { session_key: SESSION_KEY };
        if (lastRcDate) params["date>"] = lastRcDate;

        const data = await api<RaceControlEvent[]>("/race_control", params);
        const newEvents = lastRcDate ? data.filter(e => e.date > lastRcDate!) : data;

        if (newEvents.length > 0) {
            rcEvents = [...rcEvents, ...newEvents].slice(-15);
            lastRcDate = newEvents[newEvents.length - 1].date;
        }
    } catch { /* silently retry */ }
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
    clearScreen();

    const now = new Date().toLocaleTimeString("fr-FR");
    console.log("\x1b[1m\x1b[31m");
    console.log("  ╔══════════════════════════════════════════════════════════╗");
    console.log("  ║     🏎️  LIVE F1 — China Grand Prix — Qualifying        ║");
    console.log(`  ║     📡 Session ${SESSION_KEY}    ⏰ ${now}               ║`);
    console.log("  ╚══════════════════════════════════════════════════════════╝");
    console.log("\x1b[0m");

    // ── Classement ────────────────────────────────────────────────────────
    console.log("\x1b[1m\x1b[36m  ┌─── CLASSEMENT EN DIRECT ───────────────────────────────┐\x1b[0m");

    const sorted = [...positions.values()].sort((a, b) => a.position - b.position);

    console.log("  │ \x1b[90mPos  #    Pilote              Équipe            Meilleur Tour\x1b[0m │");
    console.log("  │ \x1b[90m───  ──   ──────              ──────            ─────────────\x1b[0m │");

    for (const pos of sorted) {
        const d = drivers.get(pos.driver_number);
        const name = d ? `${d.first_name.charAt(0)}. ${d.last_name}` : `#${pos.driver_number}`;
        const team = d?.team_name ?? "—";
        const best = bestLaps.get(pos.driver_number);
        const bestTime = best ? formatLapDuration(best.lap_duration) : "—";

        const posStr  = String(pos.position).padStart(2, " ");
        const numStr  = String(pos.driver_number).padStart(2, " ");
        const nameStr = name.padEnd(20, " ");
        const teamStr = team.padEnd(18, " ");

        let posColor = "\x1b[0m";
        if (pos.position <= 3)  posColor = "\x1b[33m";
        if (pos.position <= 1)  posColor = "\x1b[1m\x1b[33m";
        if (pos.position > 15)  posColor = "\x1b[31m";
        if (pos.position > 10 && pos.position <= 15) posColor = "\x1b[90m";

        console.log(`  │ ${posColor}${posStr}   ${numStr}   ${nameStr}${teamStr}${bestTime}\x1b[0m │`);
    }

    console.log("  \x1b[1m\x1b[36m└────────────────────────────────────────────────────────┘\x1b[0m");

    // ── Race Control ──────────────────────────────────────────────────────
    if (rcEvents.length > 0) {
        console.log("\n  \x1b[1m\x1b[33m┌─── 🚩 RACE CONTROL ──────────────────────────────────┐\x1b[0m");
        for (const ev of rcEvents.slice(-8)) {
            const time = formatTime(ev.date);
            const flag = ev.flag ? colorFlag(ev.flag) + " " : "";
            const driver = ev.driver_number ? `[#${ev.driver_number}] ` : "";
            console.log(`  │  ${time}  ${flag}${driver}${ev.message}`);
        }
        console.log("  \x1b[1m\x1b[33m└──────────────────────────────────────────────────────┘\x1b[0m");
    }

    console.log("\n  \x1b[90mRafraîchissement auto toutes les 3s — Ctrl+C pour quitter\x1b[0m");
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function main() {
    console.log("🏎️  Démarrage du feed live OpenF1…\n");

    const token = await getToken();
    if (token) {
        console.log("✅ Authentifié avec succès !");
    } else {
        console.log("⚠️  Mode gratuit (pas de credentials)");
    }

    console.log("📡 Chargement des pilotes…");
    await loadDrivers();
    console.log(`✅ ${drivers.size} pilotes chargés`);

    await Promise.all([pollPositions(), pollLaps(), pollRaceControl()]);
    render();

    setInterval(async () => {
        await pollPositions();
        render();
    }, POLL_INTERVAL.positions);

    setInterval(async () => {
        await pollLaps();
        render();
    }, POLL_INTERVAL.laps);

    setInterval(async () => {
        await pollRaceControl();
        render();
    }, POLL_INTERVAL.raceControl);
}

main().catch((err) => {
    console.error("💥 ERREUR:", err.message ?? err);
    process.exit(1);
});
