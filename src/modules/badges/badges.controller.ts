import { Request, Response, NextFunction } from "express";
import { BadgesService } from "./badges.service";

export class BadgesController {
    constructor(private readonly service = new BadgesService()) {}

    listBadges = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const badges = await this.service.getAllBadges();
            res.json({ status: "ok", badges });
        } catch (e) { next(e); }
    };

    createBadge = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const badge = await this.service.createBadge(req.body);
            res.status(201).json({ status: "ok", badge });
        } catch (e) { next(e); }
    };

    updateBadge = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const badge = await this.service.updateBadge(Number(req.params.badgeId), req.body);
            res.json({ status: "ok", badge });
        } catch (e) { next(e); }
    };

    deleteBadge = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.deleteBadge(Number(req.params.badgeId));
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };

    myBadges = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const badges = await this.service.getUserBadges(req.user!.id);
            res.json({ status: "ok", badges });
        } catch (e) { next(e); }
    };

    userBadges = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const badges = await this.service.getUserBadges(Number(req.params.id));
            res.json({ status: "ok", badges });
        } catch (e) { next(e); }
    };

    awardBadge = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userBadge = await this.service.awardBadge(
                Number(req.params.id),
                req.body.badgeId,
            );
            res.status(201).json({ status: "ok", userBadge });
        } catch (e) { next(e); }
    };

    revokeBadge = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.revokeBadge(Number(req.params.id), Number(req.params.badgeId));
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };
}
