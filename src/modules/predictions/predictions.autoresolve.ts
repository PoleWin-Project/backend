import { openf1Client } from "../../common/clients/openf1.client";
import { OpenF1Driver, OpenF1Lap, OpenF1Position, OpenF1RaceControl } from "../openf1/openf1.types";
import { PREDICTION_TYPES } from "./predictions.dto";

type PredictionType = (typeof PREDICTION_TYPES)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getDriverAcronymMap(sessionKey: number): Promise<Map<number, string>> {
    const drivers = await openf1Client.get<OpenF1Driver[]>("/drivers", { session_key: sessionKey });
    return new Map(drivers.map((d) => [d.driver_number, d.name_acronym]));
}

async function getFinalPositions(sessionKey: number): Promise<{ driverNumber: number; position: number }[]> {
    const positions = await openf1Client.get<OpenF1Position[]>("/position", { session_key: sessionKey });

    // Keep only the last known position per driver
    const latest = new Map<number, OpenF1Position>();
    for (const p of positions) {
        const existing = latest.get(p.driver_number);
        if (!existing || p.date > existing.date) {
            latest.set(p.driver_number, p);
        }
    }

    return Array.from(latest.values()).map((p) => ({
        driverNumber: p.driver_number,
        position:     p.position,
    }));
}

// ── Auto-resolve ──────────────────────────────────────────────────────────────

/**
 * Tries to determine the winning value for a prediction by querying OpenF1.
 * Returns null if data is unavailable or the race has not finished yet.
 *
 * Returned format per type:
 *   RACE_WINNER / POLE_POSITION / SPRINT_WINNER / FASTEST_LAP → driver acronym e.g. "VER"
 *   PODIUM_FINISH → comma-separated acronyms sorted by finish position e.g. "VER,LEC,SAI"
 *   DNF           → comma-separated acronyms of retired drivers, or "NONE"
 *   SAFETY_CAR    → "YES" or "NO"
 */
export async function autoResolve(type: PredictionType, sessionKey: number): Promise<string | null> {
    try {
        switch (type) {
            case "RACE_WINNER":
            case "POLE_POSITION":
            case "SPRINT_WINNER": {
                const positions = await getFinalPositions(sessionKey);
                const p1 = positions.find((p) => p.position === 1);
                if (!p1) return null;
                const map = await getDriverAcronymMap(sessionKey);
                return map.get(p1.driverNumber) ?? null;
            }

            case "FASTEST_LAP": {
                const laps = await openf1Client.get<OpenF1Lap[]>("/laps", { session_key: sessionKey });
                const valid = laps.filter((l) => l.lap_duration !== null && !l.is_pit_out_lap);
                if (!valid.length) return null;
                const fastest = valid.reduce((min, l) =>
                    l.lap_duration! < min.lap_duration! ? l : min,
                );
                const map = await getDriverAcronymMap(sessionKey);
                return map.get(fastest.driver_number) ?? null;
            }

            case "PODIUM_FINISH": {
                const positions = await getFinalPositions(sessionKey);
                const podium = positions.filter((p) => p.position <= 3);
                if (podium.length < 3) return null; // race not finished yet
                const map = await getDriverAcronymMap(sessionKey);
                const acronyms = podium
                    .sort((a, b) => a.position - b.position)
                    .map((p) => map.get(p.driverNumber))
                    .filter(Boolean) as string[];
                return acronyms.length === 3 ? acronyms.join(",") : null;
            }

            case "DNF": {
                const laps = await openf1Client.get<OpenF1Lap[]>("/laps", { session_key: sessionKey });
                if (!laps.length) return null;

                const maxLap = Math.max(...laps.map((l) => l.lap_number));
                if (maxLap < 3) return null; // race barely started, too early

                // Last completed lap per driver
                const driverMaxLap = new Map<number, number>();
                for (const lap of laps) {
                    const cur = driverMaxLap.get(lap.driver_number) ?? 0;
                    if (lap.lap_number > cur) driverMaxLap.set(lap.driver_number, lap.lap_number);
                }

                // Driver is considered DNF if they stopped > 2 laps before the end
                const dnfNumbers = Array.from(driverMaxLap.entries())
                    .filter(([, last]) => last < maxLap - 2)
                    .map(([num]) => num);

                if (!dnfNumbers.length) return "NONE";

                const map = await getDriverAcronymMap(sessionKey);
                const acronyms = dnfNumbers
                    .map((n) => map.get(n))
                    .filter(Boolean) as string[];
                return acronyms.length ? acronyms.join(",") : null;
            }

            case "SAFETY_CAR": {
                const events = await openf1Client.get<OpenF1RaceControl[]>("/race_control", {
                    session_key: sessionKey,
                });
                const hasSC = events.some(
                    (e) =>
                        e.message?.toUpperCase().includes("SAFETY CAR") ||
                        e.flag === "SC",
                );
                return hasSC ? "YES" : "NO";
            }
        }
    } catch {
        return null;
    }
}

// ── Winner matching ───────────────────────────────────────────────────────────

/**
 * Determines if a user's bet value is a winner given the resolved winning value.
 * - PODIUM_FINISH / DNF: winning value is a comma-separated list → user wins if their pick is in it
 * - All other types: exact match (case-insensitive trim)
 */
export function isWinnerForType(
    type: PredictionType,
    userValue: string,
    winningValue: string,
): boolean {
    const user = userValue.trim().toUpperCase();
    switch (type) {
        case "PODIUM_FINISH":
        case "DNF":
            return winningValue
                .split(",")
                .map((v) => v.trim().toUpperCase())
                .includes(user);
        default:
            return user === winningValue.trim().toUpperCase();
    }
}
