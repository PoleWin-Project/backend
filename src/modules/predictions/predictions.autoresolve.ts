import { openf1Client } from "../../common/clients/openf1.client";
import { OpenF1Driver, OpenF1Position } from "../openf1/openf1.types";
import { PREDICTION_TYPES } from "./predictions.dto";

type PredictionType = (typeof PREDICTION_TYPES)[number];

async function getDriverAcronymMap(sessionKey: number): Promise<Map<number, string>> {
    const drivers = await openf1Client.get<OpenF1Driver[]>("/drivers", { session_key: sessionKey });
    return new Map(drivers.map((d) => [d.driver_number, d.name_acronym]));
}

async function getFinalPositions(sessionKey: number): Promise<{ driverNumber: number; position: number }[]> {
    const positions = await openf1Client.get<OpenF1Position[]>("/position", { session_key: sessionKey });

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

/**
 * All 3 supported types resolve the same way: P1 at end of session → driver acronym.
 * Returns null if data is unavailable or the session has not finished yet.
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
        }
    } catch {
        return null;
    }
}

export function isWinnerForType(
    _type: PredictionType,
    userValue: string,
    winningValue: string,
): boolean {
    return userValue.trim().toUpperCase() === winningValue.trim().toUpperCase();
}
