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
}
