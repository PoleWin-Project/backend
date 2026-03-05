import { ChannelMessageModel, ChatChannelModel, UserModel } from "../../database/models";
import { CreateChannelMessageInput, ListChannelMessagesQuery } from "./channelMessages.dto";

export class ChannelMessagesRepository {
    findById(id: number) {
        return ChannelMessageModel.findByPk(id, {
            include: [
                {
                    model: UserModel,
                    as: "sender",
                    attributes: ["id", "username"],
                },
                {
                    model: ChatChannelModel,
                    as: "channel",
                    attributes: ["id", "name", "sessionId"],
                },
            ],
        });
    }

    listByChannel(channelId: number, query: ListChannelMessagesQuery) {
        return ChannelMessageModel.findAndCountAll({
            where: { channelId },
            include: [
                {
                    model: UserModel,
                    as: "sender",
                    attributes: ["id", "username"],
                },
            ],
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"],
            ],
            limit: query.limit,
            offset: query.offset,
        });
    }

    create(channelId: number, senderId: number, input: CreateChannelMessageInput) {
        return ChannelMessageModel.create({
            channelId,
            senderId,
            content: input.content,
        } as any);
    }

    async delete(id: number) {
        const message = await ChannelMessageModel.findByPk(id);
        if (!message) return false;
        await message.destroy();
        return true;
    }
}
