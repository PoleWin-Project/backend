import { httpErrors } from "../../common/errors/http";
import { SessionsRepository } from "./sessions.repository";
import { CreateSessionInput, ListSessionsQuery, UpdateSessionInput } from "./sessions.dto";
import { OpenF1Service } from "../openf1/openf1.service";

import { logger } from "../../config/logger";

export class SessionsService {
    private refreshedAt = 0;
    private refreshedYear = 0;
    private refreshInFlight: Promise<void> | null = null;
    constructor(private readonly repo = new SessionsRepository()) {}

    async list(query: ListSessionsQuery) {
        if (query.upcoming) await this.refreshCalendar();
        const { rows, count } = await this.repo.findAll(query);
        return { items: rows, total: count, limit: query.limit, offset: query.offset };
    }

    private async refreshCalendar(): Promise<void> {
        const year = new Date().getFullYear();
        if (this.refreshedYear === year && Date.now() - this.refreshedAt < 5 * 60 * 1000) return;
        if (!this.refreshInFlight) {
            this.refreshInFlight = this.syncFromOpenF1(year)
                .then(() => {
                    this.refreshedYear = year;
                    this.refreshedAt = Date.now();
                })
                .catch(err => {
                    // Keep the stored calendar available during an OpenF1 outage.
                    logger.warn({ err }, "Calendar refresh failed; using stored sessions");
                })
                .finally(() => { this.refreshInFlight = null; });
        }
        await this.refreshInFlight;
    }

    async getById(id: number) {
        const session = await this.repo.findById(id);
        if (!session) throw httpErrors.notFound("Session not found");
        return session;
    }

    create(data: CreateSessionInput) {
        return this.repo.create(data);
    }

    async update(id: number, patch: UpdateSessionInput) {
        const session = await this.repo.update(id, patch);
        if (!session) throw httpErrors.notFound("Session not found");
        return session;
    }

    async delete(id: number) {
        const deleted = await this.repo.delete(id);
        if (!deleted) throw httpErrors.notFound("Session not found");
    }

    async syncFromOpenF1(year?: number) {
        const openf1 = new OpenF1Service();
        const sessions = await openf1.getSessions({ year: year ?? new Date().getFullYear() });
        const { created, updated } = await this.repo.upsertFromOpenF1(sessions);
        return { created, updated, total: sessions.length };
    }
}

// Share refresh state between startup and HTTP requests.
let sharedService: SessionsService | undefined;
export function getSessionsService(): SessionsService {
    return sharedService ??= new SessionsService();
}
