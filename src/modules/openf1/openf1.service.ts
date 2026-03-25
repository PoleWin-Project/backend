import { openf1Client } from "../../common/clients/openf1.client";
import {
    OpenF1Driver,
    OpenF1Meeting,
    OpenF1MeetingParams,
    OpenF1RaceControl,
    OpenF1Session,
    OpenF1SessionParams,
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

    async getPositions(sessionKey: number): Promise<any[]> {
        return openf1Client.get<any[]>("/position", { session_key: sessionKey });
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
            // For Race/Sprint: Get final positions from Intervals or Positions
            // A simple heuristic: get the latest position for each driver
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
            // For Practice/Qualifying: Get fastest laps
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

    async getDriverStandings(year?: number): Promise<any[]> {
        // Championship endpoints in OpenF1 prefer session_key. 
        // Using 'latest' gives the current season standings.
        const standings = await openf1Client.get<any[]>("/championship_drivers", { session_key: "latest" });
        if (!standings || standings.length === 0) return [];

        // Get driver details from the latest session to map names/teams
        const latestSessionKey = standings[0].session_key;
        const drivers = await this.getDrivers(latestSessionKey);
        const driversMap = new Map(drivers.map(d => [d.driver_number, d]));

        return standings.map(s => ({
            driver_number: s.driver_number,
            position: s.position_current,
            points: s.points_current,
            driver: driversMap.get(s.driver_number)
        })).sort((a, b) => a.position - b.position);
    }

    async getTeamStandings(year?: number): Promise<any[]> {
        const standings = await openf1Client.get<any[]>("/championship_teams", { session_key: "latest" });
        if (!standings) return [];

        return standings.map(s => ({
            team_name: s.team_name,
            position: s.position_current,
            points: s.points_current,
            team_colour: s.team_colour
        })).sort((a, b) => a.position - b.position);
    }
}
