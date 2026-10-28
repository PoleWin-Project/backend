import { NextFunction, Request, Response } from "express";
import { LeaguesService } from "./leagues.service";

export class LeaguesController {
    constructor(private readonly service = new LeaguesService()) {}

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const league = await this.service.create(req.user!.id, req.body.name, req.body.seasonYear);
            res.status(201).json({ status: "ok", league });
        } catch (error) { next(error); }
    };

    listMine = async (req: Request, res: Response, next: NextFunction) => {
        try { res.json({ status: "ok", leagues: await this.service.listMine(req.user!.id) }); }
        catch (error) { next(error); }
    };

    join = async (req: Request, res: Response, next: NextFunction) => {
        try { res.json({ status: "ok", league: await this.service.join(req.user!.id, req.body.inviteCode) }); }
        catch (error) { next(error); }
    };

    members = async (req: Request, res: Response, next: NextFunction) => {
        try { res.json({ status: "ok", members: await this.service.members(req.user!.id, Number(req.params.id)) }); }
        catch (error) { next(error); }
    };

    leave = async (req: Request, res: Response, next: NextFunction) => {
        try { await this.service.leave(req.user!.id, Number(req.params.id)); res.json({ status: "ok" }); }
        catch (error) { next(error); }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try { await this.service.delete(req.user!.id, Number(req.params.id)); res.json({ status: "ok" }); }
        catch (error) { next(error); }
    };
}
