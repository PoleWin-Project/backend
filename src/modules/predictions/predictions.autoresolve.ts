import { openf1Client } from "../../common/clients/openf1.client";
import { OpenF1Driver, OpenF1Lap, OpenF1RaceControl, OpenF1SessionResult } from "../openf1/openf1.types";
import { PREDICTION_TYPES } from "./predictions.dto";

type PredictionType = (typeof PREDICTION_TYPES)[number];

async function getDriverAcronymMap(sessionKey: number): Promise<Map<number, string>> {
    const drivers = await openf1Client.get<OpenF1Driver[]>("/drivers", { session_key: sessionKey });
    return new Map(drivers.map((d) => [d.driver_number, d.name_acronym]));
}

/**
 * Source de vérité : `/session_result`, publié seulement après le classement officiel.
 * `date_end` et `/position` sont volontairement ignorés : pendant une interruption
 * pluie/drapeau rouge, l'heure planifiée peut être dépassée alors que `/position`
 * contient encore un classement live provisoire.
 */
export async function autoResolve(type: PredictionType, sessionKey: number): Promise<string | null> {
    try {
        const officialResults = await openf1Client.get<OpenF1SessionResult[]>(
            "/session_result",
            { session_key: sessionKey },
            undefined,
            { forceRefresh: true, cacheTtlMs: 60_000 },
        );
        if (!officialResults.length) return null;

        switch (type) {
            case "RACE_WINNER":
            case "SPRINT_WINNER":
            case "POLE_POSITION": {
                const p1 = officialResults.find((p) => p.position === 1);
                if (!p1) return null;
                const map = await getDriverAcronymMap(sessionKey);
                return map.get(p1.driver_number) ?? null;
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

            case "DNF": {
                const dnfNumbers = officialResults.filter((r) => r.dnf).map((r) => r.driver_number);

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
                const hasSC = events.some((e) => {
                    const msg = e.message?.toUpperCase() || "";
                    return (msg.includes("SAFETY CAR") && !msg.includes("VIRTUAL")) || e.flag === "SC";
                });
                return hasSC ? "YES" : "NO";
            }

            case "PODIUM": {
                const p1 = officialResults.find((p) => p.position === 1);
                const p2 = officialResults.find((p) => p.position === 2);
                const p3 = officialResults.find((p) => p.position === 3);
                if (!p1 || !p2 || !p3) return null;
                const map = await getDriverAcronymMap(sessionKey);
                const acr1 = map.get(p1.driver_number) ?? "";
                const acr2 = map.get(p2.driver_number) ?? "";
                const acr3 = map.get(p3.driver_number) ?? "";
                if (!acr1 || !acr2 || !acr3) return null;
                return `${acr1},${acr2},${acr3}`;
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
    const user = userValue.trim().toUpperCase();
    switch (_type) {
        case "DNF":
            return winningValue
                .split(",")
                .map((v) => v.trim().toUpperCase())
                .includes(user);
        default:
            return user === winningValue.trim().toUpperCase();
    }
}
