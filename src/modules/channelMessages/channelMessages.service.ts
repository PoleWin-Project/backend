import { httpErrors } from "../../common/errors/http";
import { ChatChannelModel, UserModel } from "../../database/models";
import { CreateChannelMessageInput, ListChannelMessagesQuery } from "./channelMessages.dto";
import { ChannelMessagesRepository } from "./channelMessages.repository";
import { chatLiveService } from "./channelMessages.live";

export class ChannelMessagesService {
    constructor(private readonly repo = new ChannelMessagesRepository()) {}

    async getById(id: number) {
        const channelMessage = await this.repo.findById(id);
        if (!channelMessage) throw httpErrors.notFound("Channel message not found");
        return channelMessage;
    }

    async listByChannel(channelId: number, query: ListChannelMessagesQuery) {
        const channel = await ChatChannelModel.findByPk(channelId, {
            attributes: ["id"],
        });
        if (!channel) throw httpErrors.notFound("Chat channel not found");

        const { rows, count } = await this.repo.listByChannel(channelId, query);
        const hasMore = query.before !== undefined
            ? rows.length === query.limit
            : query.offset + rows.length < count;

        return {
            items: rows,
            total: count,
            limit: query.limit,
            offset: query.offset,
            hasMore,
            // cursor for next page (load older messages): id of the oldest message in this batch
            nextCursor: hasMore && rows.length > 0 ? rows[rows.length - 1].id : null,
        };
    }

    async create(channelId: number, senderId: number, input: CreateChannelMessageInput) {
        const [channel, user] = await Promise.all([
            ChatChannelModel.findByPk(channelId, { attributes: ["id"] }),
            UserModel.findByPk(senderId, { attributes: ["id"] }),
        ]);

        if (!channel) throw httpErrors.notFound("Chat channel not found");
        if (!user) throw httpErrors.notFound("User not found");

        const message = await this.repo.create(channelId, senderId, input);
        chatLiveService.publish(channelId, message as any);
        return message;
    }

    async delete(id: number) {
        const deleted = await this.repo.delete(id);
        if (!deleted) throw httpErrors.notFound("Channel message not found");
    }
}
