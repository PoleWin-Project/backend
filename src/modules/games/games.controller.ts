import { Request, Response, NextFunction } from "express";
import { GamesService } from "./games.service";

export class GamesController {
    constructor(private readonly service = new GamesService()) { }

    rewardUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.id;
            const { points, gameId } = req.body;

            const result = await this.service.rewardUser(userId, points, gameId);
            res.status(200).json({ status: "success", ...result });
        } catch (e) {
            next(e);
        }
    };
}
