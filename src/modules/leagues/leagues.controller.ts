import { NextFunction, Request, Response } from "express";
import { UserModel } from "../../database/models";
import { withPublicAvatars } from "../paddock/publicAvatars";
import { notifyUser } from "../push/push.service";
import { CreateLeagueInput, JoinLeagueInput, UpdateLeagueInput } from "./leagues.dto";
import { LeaguesService } from "./leagues.service";

export class LeaguesController {
    constructor(private readonly service = new LeaguesService()) {}

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            res.json({ status: "ok", leagues: await this.service.list(req.user!.id) });
        } catch (e) { next(e); }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name, scoringMode } = req.body as CreateLeagueInput;
            const league = await this.service.create(req.user!.id, name, scoringMode);
            res.status(201).json({ status: "ok", league: await withPublicAvatars(league) });
        } catch (e) { next(e); }
    };

    join = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { inviteCode } = req.body as JoinLeagueInput;
            const result = await this.service.join(req.user!.id, inviteCode);
            if (result.joined && result.ownerUserId !== req.user!.id) {
                const member = await UserModel.findByPk(req.user!.id, { attributes: ["username"] });
                void notifyUser(result.ownerUserId, {
                    title: "Nouveau pilote dans ton Écurie",
                    body: `${member?.username ?? "Un pilote"} vient de rejoindre ${result.league.name}.`,
                    data: { type: "league", leagueId: result.leagueId },
                });
            }
            res.status(result.joined ? 201 : 200).json({
                status: "ok",
                joined: result.joined,
                league: await withPublicAvatars(result.league),
            });
        } catch (e) { next(e); }
    };

    get = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const league = await this.service.get(Number(req.params.id), req.user!.id);
            res.json({ status: "ok", league: await withPublicAvatars(league) });
        } catch (e) { next(e); }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name } = req.body as UpdateLeagueInput;
            const league = await this.service.update(Number(req.params.id), req.user!.id, name);
            res.json({ status: "ok", league: await withPublicAvatars(league) });
        } catch (e) { next(e); }
    };

    regenerateInvite = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.regenerateInvite(Number(req.params.id), req.user!.id);
            res.json({ status: "ok", ...result });
        } catch (e) { next(e); }
    };

    leave = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.leave(Number(req.params.id), req.user!.id);
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };

    removeMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.removeMember(Number(req.params.id), req.user!.id, Number(req.params.userId));
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.delete(Number(req.params.id), req.user!.id);
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };
}
