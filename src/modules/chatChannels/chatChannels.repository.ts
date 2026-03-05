import { ChatChannelModel, RaceSessionModel } from "../../database/models";
import {
    CreateChatChannelInput,
    ListChatChannelsQuery,
} from "./chatChannels.dto";

export class ChatChannelsRepository {
    findById(id: number) {
        return ChatChannelModel.findByPk(id, {
            include: [{ model: RaceSessionModel, as: "session" }],
        });
    }

    listBySession(sessionId: number, query: ListChatChannelsQuery) {
        return ChatChannelModel.findAndCountAll({
            where: { sessionId },
            order: [
                ["id", "ASC"],
            ],
            limit: query.limit,
            offset: query.offset,
        });
    }

    findBySessionId(sessionId: number) {
        return ChatChannelModel.findOne({ where: { sessionId } });
    }

    create(sessionId: number, input: CreateChatChannelInput) {
        return ChatChannelModel.create({
            sessionId,
            name: input.name,
        } as any);
    }
}
