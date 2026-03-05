import { NextFunction, Request, Response } from "express";
import { httpErrors } from "../../common/errors/http";
import { ListChannelMessagesQuery } from "./channelMessages.dto";
import { ChannelMessagesService } from "./channelMessages.service";

function parsePositiveInt(value: string, field: string) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
        throw httpErrors.badRequest(`Invalid ${field}`);
    }
    return n;
}

export class ChannelMessagesController {
    constructor(private readonly service = new ChannelMessagesService()) {}

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const channelMessageId = parsePositiveInt(req.params.id, "channel_message id");
            const channelMessage = await this.service.getById(channelMessageId);
            return res.json({ status: "ok", channelMessage });
        } catch (e) {
            next(e);
        }
    };

    listByChannel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const channelId = parsePositiveInt(req.params.channelId, "channel id");
            const data = await this.service.listByChannel(channelId, req.query as unknown as ListChannelMessagesQuery);
            return res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const channelId = parsePositiveInt(req.params.channelId, "channel id");
            const senderId = req.user!.id;
            const channelMessage = await this.service.create(channelId, senderId, req.body);
            return res.status(201).json({ status: "ok", channelMessage });
        } catch (e) {
            next(e);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const channelMessageId = parsePositiveInt(req.params.id, "channel_message id");
            await this.service.delete(channelMessageId);
            return res.json({ status: "ok" });
        } catch (e) {
            next(e);
        }
    };
}
