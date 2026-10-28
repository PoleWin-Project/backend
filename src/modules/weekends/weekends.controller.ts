import { NextFunction, Request, Response } from "express";
import { WeekendsService } from "./weekends.service";

export class WeekendsController {
    constructor(private readonly service = new WeekendsService()) {}

    next = async (_req: Request, res: Response, next: NextFunction) => {
        try { res.json({ status: "ok", weekend: await this.service.next() }); }
        catch (error) { next(error); }
    };

    get = async (req: Request, res: Response, next: NextFunction) => {
        try { res.json({ status: "ok", weekend: await this.service.get(Number(req.params.meetingKey)) }); }
        catch (error) { next(error); }
    };
}
