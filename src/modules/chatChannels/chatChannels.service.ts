import { httpErrors } from "../../common/errors/http";
import { RaceSessionModel } from "../../database/models";
import {
    ListChatChannelsQuery,
} from "./chatChannels.dto";
import { ChatChannelsRepository } from "./chatChannels.repository";

export class ChatChannelsService {
    constructor(private readonly repo = new ChatChannelsRepository()) {}

    async getById(id: number) {
        const channel = await this.repo.findById(id);
        if (!channel) throw httpErrors.notFound("Chat channel not found");
        return channel;
    }

    async listBySession(sessionId: number, query: ListChatChannelsQuery) {
        const raceSession = await RaceSessionModel.findByPk(sessionId, {
            attributes: ["id", "name"],
        });
        if (!raceSession) throw httpErrors.notFound("Race session not found");

        await this.ensureLiveChannelForSession(sessionId, raceSession.name);

        const { rows, count } = await this.repo.listBySession(sessionId, query);
        return {
            items: rows,
            total: count,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + rows.length < count,
        };
    }

    async ensureLiveChannelForSession(sessionId: number, sessionName?: string) {
        const raceSession = await RaceSessionModel.findByPk(sessionId, {
            attributes: ["id"],
        });
        if (!raceSession) throw httpErrors.notFound("Race session not found");

        const existing = await this.repo.findBySessionId(sessionId);
        if (existing) return existing;

        const channelName = sessionName
            ? `Live - ${sessionName}`
            : `Live - Session #${sessionId}`;
        return this.repo.create(sessionId, { name: channelName });
    }
}
