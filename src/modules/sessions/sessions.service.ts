import { httpErrors } from "../../common/errors/http";
import { SessionsRepository } from "./sessions.repository";
import { CreateSessionInput, ListSessionsQuery, UpdateSessionInput } from "./sessions.dto";
import { SyncService } from "../predictions/sync.service";

export class SessionsService {
    constructor(private readonly repo = new SessionsRepository()) {}

    async list(query: ListSessionsQuery) {
        const { rows, count } = await this.repo.findAll(query);
        return { items: rows, total: count, limit: query.limit, offset: query.offset };
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
        const result = await new SyncService().syncSeason(year ?? new Date().getFullYear());
        return { created: result.sessionsCreated, updated: result.sessionsUpdated, predictionsCreated: result.predictionsCreated, total: result.total };
    }
}
