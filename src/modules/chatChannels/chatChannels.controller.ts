import { NextFunction, Request, Response } from "express";
import { httpErrors } from "../../common/errors/http";
import { ChatChannelsService } from "./chatChannels.service";
import { ListChatChannelsQuery } from "./chatChannels.dto";

function parsePositiveInt(value: string, field: string) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
        throw httpErrors.badRequest(`Invalid ${field}`);
    }
    return n;
}

export class ChatChannelsController {
    constructor(private readonly service = new ChatChannelsService()) {}

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const channelId = parsePositiveInt(req.params.id, "channel id");
            const channel = await this.service.getById(channelId);
            return res.json({ status: "ok", channel });
        } catch (e) {
            next(e);
        }
    };

    listBySession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = parsePositiveInt(req.params.sessionId, "session id");
            const data = await this.service.listBySession(sessionId, req.query as unknown as ListChatChannelsQuery);
            return res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };
}
