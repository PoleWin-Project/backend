import { Request, Response, NextFunction } from "express";
import { GamesService } from "./games.service";

export class GamesController {
    constructor(private readonly service = new GamesService()) {}

    rewardUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user    = (req as any).user;
            const isAdmin = Array.isArray(user?.roles) && user.roles.includes("admin");
            const { points, gameId, metricMs } = req.body;

            const result = await this.service.rewardUser(user.id, points, gameId, isAdmin, metricMs);
            res.status(200).json({ status: "success", ...result });
        } catch (e) {
            next(e);
        }
    };

    falseStart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user    = (req as any).user;
            const isAdmin = Array.isArray(user?.roles) && user.roles.includes("admin");
            const { gameId } = req.body;

            if (!gameId) {
                res.status(400).json({ status: "error", message: "gameId is required" });
                return;
            }

            const result = await this.service.recordFalseStart(user.id, gameId, isAdmin);
            res.status(200).json({ status: "success", ...result });
        } catch (e) {
            next(e);
        }
    };

    playsToday = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user    = (req as any).user;
            const isAdmin = Array.isArray(user?.roles) && user.roles.includes("admin");
            const gameId  = String(req.query.gameId ?? "");

            if (!gameId) {
                res.status(400).json({ status: "error", message: "gameId is required" });
                return;
            }

            const result = await this.service.getPlaysToday(user.id, gameId, isAdmin);
            res.json({ status: "ok", ...result });
        } catch (e) {
            next(e);
        }
    };

    leaderboard = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user   = (req as any).user;
            const gameId = String(req.query.gameId ?? "");

            if (!gameId) {
                res.status(400).json({ status: "error", message: "gameId is required" });
                return;
            }

            const result = await this.service.getLeaderboard(gameId, user.id);
            res.json({ status: "ok", ...result });
        } catch (e) {
            next(e);
        }
    };
}
