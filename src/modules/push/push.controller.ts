import { NextFunction, Request, Response } from "express";
import { PushService } from "./push.service";
import { RegisterPushTokenInput, RemovePushTokenInput } from "./push.dto";

export class PushController {
    constructor(private readonly service = new PushService()) {}

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token, platform } = req.body as RegisterPushTokenInput;
            await this.service.registerToken(req.user!.id, token, platform);
            res.status(201).json({ status: "ok" });
        } catch (e) { next(e); }
    };

    remove = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = req.body as RemovePushTokenInput;
            await this.service.removeToken(token);
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };
}
