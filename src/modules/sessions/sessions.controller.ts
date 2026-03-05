import { Request, Response, NextFunction } from "express";
import { SessionsService } from "./sessions.service";

export class SessionsController {
    constructor(private readonly service = new SessionsService()) {}

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.list(req.query as any);
            res.json({ status: "ok", ...result });
        } catch (e) { next(e); }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.getById(Number(req.params.sessionId));
            res.json({ status: "ok", session });
        } catch (e) { next(e); }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.create(req.body);
            res.status(201).json({ status: "ok", session });
        } catch (e) { next(e); }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.update(Number(req.params.sessionId), req.body);
            res.json({ status: "ok", session });
        } catch (e) { next(e); }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.delete(Number(req.params.sessionId));
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };
}
