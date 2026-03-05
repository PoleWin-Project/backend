import { NextFunction, Request, Response } from "express";
import { RaceSessionsService } from "./raceSessions.service";

export class RaceSessionsController {
    constructor(private readonly service = new RaceSessionsService()) {}

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.list(req.query as any);
            return res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.getById(Number(req.params.id));
            return res.json({ status: "ok", session });
        } catch (e) {
            next(e);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.create(req.body);
            return res.status(201).json({ status: "ok", session });
        } catch (e) {
            next(e);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.update(Number(req.params.id), req.body);
            return res.json({ status: "ok", session });
        } catch (e) {
            next(e);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.delete(Number(req.params.id));
            return res.json({ status: "ok" });
        } catch (e) {
            next(e);
        }
    };

    importFromOpenF1 = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sessionKey } = req.params as unknown as { sessionKey: string };
            const result = await this.service.importFromOpenF1SessionKey(Number(sessionKey));
            return res.status(result.created ? 201 : 200).json({ status: "ok", ...result });
        } catch (e) {
            next(e);
        }
    };

    importLatestFromOpenF1 = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.importLatestFromOpenF1();
            return res.status(result.created ? 201 : 200).json({ status: "ok", ...result });
        } catch (e) {
            next(e);
        }
    };
}

