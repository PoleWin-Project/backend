import { openf1Client } from "../../common/clients/openf1.client";
import { OpenF1Driver } from "../openf1/openf1.types";
import { PREDICTION_TYPES } from "./predictions.dto";

type PredictionType = (typeof PREDICTION_TYPES)[number];

async function getDriverAcronymMap(sessionKey: number): Promise<Map<number, string>> {
    const drivers = await openf1Client.get<OpenF1Driver[]>("/drivers", { session_key: sessionKey });
    return new Map(drivers.map((d) => [d.driver_number, d.name_acronym]));
}

export async function autoResolve(type: PredictionType, sessionKey: number): Promise<string | null> {
    try {
        const sessions = await openf1Client.get<{ date_end: string | null }[]>("/sessions", { session_key: sessionKey });
        const endedAt = sessions[0]?.date_end;
        if (!endedAt || Date.parse(endedAt) >= Date.now()) return null;

        switch (type) {
            case "RACE_WINNER":
            case "POLE_POSITION":
            case "SPRINT_WINNER": {
                const results = await openf1Client.get<{ driver_number: number; position: number; dsq?: boolean }[]>(
                    "/session_result", { session_key: sessionKey }, undefined, { noCache: true },
                );
                const p1 = results.find((r) => r.position === 1 && !r.dsq);
                if (!p1) return null;
                const map = await getDriverAcronymMap(sessionKey);
                return map.get(p1.driver_number) ?? null;
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
