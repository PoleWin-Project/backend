import { openf1Client } from "../../common/clients/openf1.client";
import {
    OpenF1Driver,
    OpenF1DriverParams,
    OpenF1Meeting,
    OpenF1MeetingParams,
    OpenF1Pit,
    OpenF1RaceControl,
    OpenF1Session,
    OpenF1SessionParams,
    OpenF1Stint,
    OpenF1Team,
    OpenF1TeamRadio,
    OpenF1Weather,
} from "./openf1.types";

const DRIVER_ROSTER_CACHE_TTL_MS = 30 * 1000;

interface DriverRefreshOptions {
    forceRefresh?: boolean;
}

export class OpenF1Service {
    async getMeetings(params?: OpenF1MeetingParams): Promise<OpenF1Meeting[]> {
        return openf1Client.get<OpenF1Meeting[]>("/meetings", params as Record<string, string | number | boolean | undefined>);
    }

    async getSessions(params?: OpenF1SessionParams): Promise<OpenF1Session[]> {
        return openf1Client.get<OpenF1Session[]>("/sessions", params as Record<string, string | number | boolean | undefined>);
    }

    async getSessionByKey(sessionKey: number): Promise<OpenF1Session | null> {
        const results = await openf1Client.get<OpenF1Session[]>("/sessions", { session_key: sessionKey });
        return results[0] ?? null;
    }

    async getDrivers(sessionKey: number | "latest", options?: DriverRefreshOptions): Promise<OpenF1Driver[]> {
        if (options) {
            return openf1Client.get<OpenF1Driver[]>(
                "/drivers",
                { session_key: sessionKey },
                undefined,
                {
                    cacheTtlMs: DRIVER_ROSTER_CACHE_TTL_MS,
                    forceRefresh: options.forceRefresh,
                },
            );
        }
        return openf1Client.get<OpenF1Driver[]>("/drivers", { session_key: sessionKey });
    }

    /**
     * OpenF1 ne publie pas toujours `/drivers` avant le début d'une session.
     * L'endpoint public doit malgré tout fournir la grille pour les pronostics.
     */
    async getDriversWithFallback(
        sessionKey: number | "latest",
        options: DriverRefreshOptions = {},
    ): Promise<OpenF1Driver[]> {
        let session: OpenF1Session | null = null;

        if (typeof sessionKey === "number") {
            try {
                session = await this.getSessionByKey(sessionKey);
            } catch {
                // On tentera tout de même la source directe puis le classement.
            }
        }

        const isFutureSession = session
            ? new Date(session.date_start).getTime() > Date.now()
            : false;

        // OpenF1 peut publier la grille d'une session future dès qu'un réserviste
        // est confirmé. Elle est donc prioritaire sur la session précédente et
        // sur le classement de la saison.
        try {
            const drivers = await this.getDrivers(sessionKey, options);
            if (drivers.length > 0) return drivers;
        } catch {
            // Une session future non publiée est normale : on utilise les replis.
        }

        if (isFutureSession && session) {
            try {
                const meetingSessions = await this.getSessions({
                    meeting_key: session.meeting_key,
                    year: session.year,
                });
                const previousSessions = meetingSessions
                    .filter(candidate => (
                        candidate.session_key !== sessionKey
                        && new Date(candidate.date_start).getTime() <= Date.now()
                    ))
                    .sort((a, b) => b.date_start.localeCompare(a.date_start));

                for (const previousSession of previousSessions) {
                    try {
                        const drivers = await this.getDrivers(previousSession.session_key, options);
                        if (drivers.length > 0) return drivers;
                    } catch {
                        // Essaie la session précédente du même week-end.
                    }
                }
            } catch {
                // Le classement saisonnier reste le dernier recours.
            }
        }

        const standings = await this.getDriverStandings(session?.year);
        const targetSessionKey = typeof sessionKey === "number" ? sessionKey : 0;

        return standings
            .map((standing: any): OpenF1Driver | null => {
                const driver = standing.driver;
                if (!driver?.name_acronym || !standing.driver_number) return null;

                const nameParts = String(driver.full_name || driver.name_acronym).trim().split(/\s+/);
                const firstName = driver.first_name || nameParts.slice(0, -1).join(" ");
                const lastName = driver.last_name || nameParts[nameParts.length - 1] || driver.name_acronym;

                return {
                    broadcast_name: driver.broadcast_name || `${firstName.charAt(0)} ${lastName}`.trim(),
                    country_code: driver.country_code || "",
                    driver_number: Number(standing.driver_number),
                    first_name: firstName,
                    full_name: driver.full_name || driver.name_acronym,
                    headshot_url: driver.headshot_url || null,
                    last_name: lastName,
                    meeting_key: driver.meeting_key || session?.meeting_key || 0,
                    name_acronym: driver.name_acronym,
                    session_key: driver.session_key || targetSessionKey,
                    team_colour: driver.team_colour || "FFFFFF",
                    team_name: driver.team_name || "",
                };
            })
            .filter((driver: OpenF1Driver | null): driver is OpenF1Driver => driver !== null);
    }

    async getRaceControl(sessionKey: number): Promise<OpenF1RaceControl[]> {
        return openf1Client.get<OpenF1RaceControl[]>("/race_control", { session_key: sessionKey });
    }

    async getLatestSession(): Promise<OpenF1Session | null> {
        const results = await openf1Client.get<OpenF1Session[]>("/sessions", { session_key: "latest" });
        return results[0] ?? null;
    }

    async getLatestMeeting(): Promise<OpenF1Meeting | null> {
        const results = await openf1Client.get<OpenF1Meeting[]>("/meetings", { meeting_key: "latest" });
        return results[0] ?? null;
    }

    async getCalendar(year?: number): Promise<OpenF1Meeting[]> {
        const targetYear = year ?? new Date().getFullYear();
        return openf1Client.get<OpenF1Meeting[]>("/meetings", { year: targetYear });
    }

    async getUpcomingSessions(limit = 10): Promise<OpenF1Session[]> {
        const year = new Date().getFullYear();
        const sessions = await openf1Client.get<OpenF1Session[]>("/sessions", { year });
        const now = new Date().toISOString();
        return sessions
            .filter((s) => s.date_start > now)
            .sort((a, b) => a.date_start.localeCompare(b.date_start))
            .slice(0, limit);
    }

    async getNextSession(): Promise<OpenF1Session | null> {
        const upcoming = await this.getUpcomingSessions(1);
        return upcoming[0] ?? null;
    }

    // ── Session data ──────────────────────────────────────────────────────────

    async getWeather(sessionKey: number): Promise<OpenF1Weather[]> {
        return openf1Client.get<OpenF1Weather[]>("/weather", { session_key: sessionKey });
    }

    async getPitStops(sessionKey: number): Promise<OpenF1Pit[]> {
        return openf1Client.get<OpenF1Pit[]>("/pit", { session_key: sessionKey });
    }

    async getStints(sessionKey: number): Promise<OpenF1Stint[]> {
        return openf1Client.get<OpenF1Stint[]>("/stints", { session_key: sessionKey });
    }

    async getTeamRadio(sessionKey: number): Promise<OpenF1TeamRadio[]> {
        return openf1Client.get<OpenF1TeamRadio[]>("/team_radio", { session_key: sessionKey });
    }

    async getLocations(sessionKey: number | "latest"): Promise<any[]> {
        // OpenF1 /location returns ~3.7Hz samples per driver. Fetching the full
        // session would be millions of records, so we ask only for points from
        // the last few seconds and keep the most recent one per driver.
        const sinceIso = new Date(Date.now() - 6_000).toISOString();
        const all = await openf1Client.get<any[]>(
            "/location",
            { session_key: sessionKey },
            [`date>${sinceIso}`],
            { noCache: true },
        );
        if (!Array.isArray(all) || all.length === 0) return [];

        const latest = new Map<number, any>();
        for (const p of all) {
            const existing = latest.get(p.driver_number);
            if (!existing || (p.date && p.date > existing.date)) {
                latest.set(p.driver_number, p);
            }
        }
        return [...latest.values()];
    }

    async getPositions(sessionKey: number): Promise<any[]> {
        return openf1Client.get<any[]>("/position", { session_key: sessionKey });
    }

    async getLatestPositions(sessionKey: number | "latest"): Promise<any[]> {
        // OpenF1 only emits a `/position` event when a driver's position
        // CHANGES. Filtering by recent date drops drivers who are stable at
        // the front of the pack. We pull the full session log instead and
        // keep the most recent event per driver. The result is small because
        // the endpoint only logs changes, not periodic samples.
        const all = await openf1Client.get<any[]>(
            "/position",
            { session_key: sessionKey },
            undefined,
            { noCache: true },
        );
        if (!Array.isArray(all) || all.length === 0) return [];

        const latest = new Map<number, any>();
        for (const p of all) {
            if (!p.position || !p.driver_number) continue;
            const existing = latest.get(p.driver_number);
            if (!existing || (p.date && p.date > existing.date)) {
                latest.set(p.driver_number, p);
            }
        }
        return [...latest.values()].sort((a, b) => a.position - b.position);
    }

    async getLaps(sessionKey: number): Promise<any[]> {
        return openf1Client.get<any[]>("/laps", { session_key: sessionKey });
    }

    async getIntervals(sessionKey: number): Promise<any[]> {
        return openf1Client.get<any[]>("/intervals", { session_key: sessionKey });
    }

    async getSessionResults(sessionKey: number) {
        const session = await this.getSessionByKey(sessionKey);
        if (!session) return null;

        const drivers = await this.getDrivers(sessionKey);
        const driversMap = new Map(drivers.map(d => [d.driver_number, d]));

        if (session.session_type === "Race" || session.session_name.toLowerCase().includes("race") || session.session_name.toLowerCase().includes("sprint")) {
            const positions = await this.getPositions(sessionKey);
            const latestPositions = new Map<number, number>();
            positions.forEach(p => {
                latestPositions.set(p.driver_number, p.position);
            });

            return Array.from(latestPositions.entries())
                .map(([num, pos]) => ({
                    position: pos,
                    driver_number: num,
                    driver: driversMap.get(num),
                }))
                .sort((a, b) => a.position - b.position);
        } else {
            const laps = await this.getLaps(sessionKey);
            const fastestLaps = new Map<number, number>();
            laps.forEach(l => {
                if (l.lap_duration && (!fastestLaps.has(l.driver_number) || l.lap_duration < fastestLaps.get(l.driver_number)!)) {
                    fastestLaps.set(l.driver_number, l.lap_duration);
                }
            });

            return Array.from(fastestLaps.entries())
                .map(([num, time]) => ({
                    time,
                    driver_number: num,
                    driver: driversMap.get(num),
                }))
                .sort((a, b) => (a.time || Infinity) - (b.time || Infinity))
                .map((r, i) => ({ ...r, position: i + 1 }));
        }
    }

    // ── Standings ─────────────────────────────────────────────────────────────

    async getDriverStandings(year?: number): Promise<any[]> {
        try {
            const y = year ?? "current";
            const url = `https://api.jolpi.ca/ergast/f1/${y}/driverStandings.json`;
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error(`Ergast API error: ${res.status}`);
            const data = await res.json();
            
            const standings = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
            
            let driversMap = new Map<number, OpenF1Driver>();
            let driversByName = new Map<string, OpenF1Driver>();
            try {
                const latestSession = await this.getLatestSession();
                if (latestSession) {
                    const drivers = await this.getDrivers(latestSession.session_key);
                    driversMap = new Map(drivers.map(d => [d.driver_number, d]));
                    driversByName = new Map(drivers.map(d => [d.full_name.trim().toLowerCase(), d]));
                }
            } catch (error) {
                // Le classement Jolpica reste exploitable sans les métadonnées
                // facultatives d'OpenF1 (photo, couleur exacte, etc.).
                console.warn("[OpenF1Service] Driver enrichment unavailable:", error);
            }

            return standings.map((s: any) => {
                const rawNumber = s.Driver.permanentNumber;
                const parsedNumber = rawNumber === null || rawNumber === undefined || rawNumber === ""
                    ? null
                    : Number(rawNumber);
                const permanentNumber = parsedNumber !== null && Number.isFinite(parsedNumber) ? parsedNumber : null;
                const fullName = `${s.Driver.givenName} ${s.Driver.familyName}`.trim();
                const liveDriver = permanentNumber !== null
                    ? driversMap.get(permanentNumber)
                    : driversByName.get(fullName.toLowerCase());
                const num = permanentNumber ?? liveDriver?.driver_number ?? null;
                return {
                    driver_number: num,
                    position: Number(s.position),
                    points: Number(s.points),
                    wins: Number(s.wins),
                    driver: {
                        ...(liveDriver || {}),
                        full_name: fullName,
                        name_acronym: s.Driver.code || liveDriver?.name_acronym,
                        team_name: s.Constructors[0]?.name,
                        nationality: s.Driver.nationality,
                        driver_id: s.Driver.driverId
                    },
                };
            });
        } catch (e) {
            console.error("[OpenF1Service] Failed to fetch driver standings:", e);
            return [];
        }
    }

    async getTeamStandings(year?: number): Promise<any[]> {
        try {
            const y = year ?? "current";
            const url = `https://api.jolpi.ca/ergast/f1/${y}/constructorStandings.json`;
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error(`Ergast API error: ${res.status}`);
            const data = await res.json();

            const standings = data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];

            const latestSession = await this.getLatestSession();
            let teamsMap = new Map();
            if (latestSession) {
                const teams = await this.getTeamsForSession(latestSession.session_key);
                teamsMap = new Map(teams.map(t => [t.team_name.toLowerCase(), t]));
            }

            return standings.map((s: any) => {
                const teamName = s.Constructor.name;
                const openf1Team = Array.from(teamsMap.values()).find(t => 
                    t.team_name.toLowerCase().includes(teamName.toLowerCase()) || 
                    teamName.toLowerCase().includes(t.team_name.toLowerCase())
                );
                
                return {
                    position: Number(s.position),
                    points: Number(s.points),
                    wins: Number(s.wins),
                    team_name: teamName,
                    team_id: s.Constructor.constructorId,
                    nationality: s.Constructor.nationality,
                    team_colour: openf1Team?.team_colour,
                };
            });
        } catch (e) {
            console.error("[OpenF1Service] Failed to fetch team standings:", e);
            return [];
        }
    }

    // ── Drivers ───────────────────────────────────────────────────────────────

    async listDrivers(params?: OpenF1DriverParams): Promise<OpenF1Driver[]> {
        return openf1Client.get<OpenF1Driver[]>("/drivers", params as Record<string, string | number | boolean | undefined>);
    }

    async getDriverByNumber(driverNumber: number, sessionKey?: number | string): Promise<OpenF1Driver | null> {
        const params: Record<string, string | number> = { driver_number: driverNumber };
        if (sessionKey !== undefined) params.session_key = sessionKey;
        const results = await openf1Client.get<OpenF1Driver[]>("/drivers", params);
        return results[results.length - 1] ?? null;
    }

    // ── Teams (derived from driver data) ─────────────────────────────────────

    private driversToTeams(drivers: OpenF1Driver[]): OpenF1Team[] {
        const map = new Map<string, OpenF1Team>();
        for (const d of drivers) {
            if (!map.has(d.team_name)) {
                map.set(d.team_name, { team_name: d.team_name, team_colour: d.team_colour, drivers: [] });
            }
            map.get(d.team_name)!.drivers.push({
                driver_number: d.driver_number,
                name_acronym:  d.name_acronym,
                full_name:     d.full_name,
                headshot_url:  d.headshot_url,
            });
        }
        return Array.from(map.values()).sort((a, b) => a.team_name.localeCompare(b.team_name));
    }

    async getTeamsForSession(sessionKey: number | "latest"): Promise<OpenF1Team[]> {
        const drivers = await this.getDrivers(sessionKey);
        return this.driversToTeams(drivers);
    }

    async listTeams(sessionKey?: number): Promise<OpenF1Team[]> {
        const key = sessionKey ?? "latest";
        const drivers = await openf1Client.get<OpenF1Driver[]>("/drivers", { session_key: key });
        return this.driversToTeams(drivers);
    }

    // ── By driver ─────────────────────────────────────────────────────────────

    async getPitStopsByDriver(sessionKey: number, driverNumber: number): Promise<OpenF1Pit[]> {
        return openf1Client.get<OpenF1Pit[]>("/pit", { session_key: sessionKey, driver_number: driverNumber });
    }

    async getStintsByDriver(sessionKey: number, driverNumber: number): Promise<OpenF1Stint[]> {
        return openf1Client.get<OpenF1Stint[]>("/stints", { session_key: sessionKey, driver_number: driverNumber });
    }

    async getTeamRadioByDriver(sessionKey: number, driverNumber: number): Promise<OpenF1TeamRadio[]> {
        return openf1Client.get<OpenF1TeamRadio[]>("/team_radio", { session_key: sessionKey, driver_number: driverNumber });
    }

    // ── By team ───────────────────────────────────────────────────────────────

    private async getDriverNumbersForTeam(sessionKey: number, teamName: string): Promise<number[]> {
        const drivers = await this.getDrivers(sessionKey);
        return drivers
            .filter(d => d.team_name.toLowerCase() === teamName.toLowerCase())
            .map(d => d.driver_number);
    }

    async getPitStopsByTeam(sessionKey: number, teamName: string): Promise<OpenF1Pit[]> {
        const numbers = await this.getDriverNumbersForTeam(sessionKey, teamName);
        const results = await Promise.all(
            numbers.map(n => openf1Client.get<OpenF1Pit[]>("/pit", { session_key: sessionKey, driver_number: n })),
        );
        return results.flat().sort((a, b) => a.lap_number - b.lap_number);
    }

    async getStintsByTeam(sessionKey: number, teamName: string): Promise<OpenF1Stint[]> {
        const numbers = await this.getDriverNumbersForTeam(sessionKey, teamName);
        const results = await Promise.all(
            numbers.map(n => openf1Client.get<OpenF1Stint[]>("/stints", { session_key: sessionKey, driver_number: n })),
        );
        return results.flat().sort((a, b) => a.lap_start - b.lap_start);
    }

    async getTeamRadioByTeam(sessionKey: number, teamName: string): Promise<OpenF1TeamRadio[]> {
        const numbers = await this.getDriverNumbersForTeam(sessionKey, teamName);
        const results = await Promise.all(
            numbers.map(n => openf1Client.get<OpenF1TeamRadio[]>("/team_radio", { session_key: sessionKey, driver_number: n })),
        );
        return results.flat().sort((a, b) => a.date.localeCompare(b.date));
    }
}
