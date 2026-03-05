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

    async getDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
        return openf1Client.get<OpenF1Driver[]>("/drivers", { session_key: sessionKey });
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

    async getTeamsForSession(sessionKey: number): Promise<OpenF1Team[]> {
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
