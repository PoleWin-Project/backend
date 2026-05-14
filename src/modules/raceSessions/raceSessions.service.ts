import { httpErrors } from "../../common/errors/http";
import { OpenF1Service } from "../openf1/openf1.service";
import { ChatChannelsService } from "../chatChannels/chatChannels.service";
import {
    CreateRaceSessionInput,
    ListRaceSessionsQuery,
    UpdateRaceSessionInput,
} from "./raceSessions.dto";
import { RaceSessionsRepository } from "./raceSessions.repository";

export class RaceSessionsService {
    constructor(
        private readonly repo = new RaceSessionsRepository(),
        private readonly openf1Service = new OpenF1Service(),
        private readonly chatChannelsService = new ChatChannelsService(),
    ) {}

    async list(query: ListRaceSessionsQuery) {
        const { rows, count } = await this.repo.list(query);
        return {
            items: rows,
            total: count,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + rows.length < count,
        };
    }

    async getById(id: number) {
        const session = await this.repo.findById(id);
        if (!session) throw httpErrors.notFound("Race session not found");
        return session;
    }

    async create(input: CreateRaceSessionInput) {
        const created = await this.repo.create(input);
        await this.chatChannelsService.ensureLiveChannelForSession(created.id, created.name);
        return created;
    }

    async update(id: number, patch: UpdateRaceSessionInput) {
        const updated = await this.repo.update(id, patch);
        if (!updated) throw httpErrors.notFound("Race session not found");
        return updated;
    }

    async delete(id: number) {
        const deleted = await this.repo.delete(id);
        if (!deleted) throw httpErrors.notFound("Race session not found");
    }

    async importFromOpenF1SessionKey(sessionKey: number) {
        const openf1Session = await this.openf1Service.getSessionByKey(sessionKey);
        if (!openf1Session) {
            throw httpErrors.notFound("OpenF1 session not found");
        }

        const existing = await this.repo.findByExternalId(openf1Session.session_key);
        const payload = {
            idCourseExternal: openf1Session.session_key,
            name: openf1Session.session_name,
            type: openf1Session.session_name,
            dateStart: openf1Session.date_start ? new Date(openf1Session.date_start) : null,
        };

        if (existing) {
            const updated = await this.repo.update(existing.id, payload);
            if (!updated) throw httpErrors.notFound("Race session not found");
            await this.chatChannelsService.ensureLiveChannelForSession(updated.id, updated.name);
            return { created: false as const, session: updated };
        }

        const created = await this.repo.create(payload);
        await this.chatChannelsService.ensureLiveChannelForSession(created.id, created.name);
        return { created: true as const, session: created };
    }

    async importLatestFromOpenF1() {
        const latest = await this.openf1Service.getLatestSession();
        if (!latest) throw httpErrors.notFound("OpenF1 latest session not found");
        return this.importFromOpenF1SessionKey(latest.session_key);
    }
}
