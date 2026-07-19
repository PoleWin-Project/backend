import { Request, Response, NextFunction } from "express";
import { DriverDleService } from "./driverDle.service";

export class DriverDleController {
    constructor(private readonly service = new DriverDleService()) {}

    roster = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const roster = await this.service.getRoster();
            res.json({ status: "ok", roster });
        } catch (e) {
            next(e);
        }
    };

    guess = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user    = (req as any).user;
            const isAdmin = Array.isArray(user?.roles) && user.roles.includes("admin");
            const driverId = req.body?.driverId;

            if (driverId === undefined || driverId === null || driverId === "") {
                res.status(400).json({ status: "error", message: "driverId is required" });
                return;
            }

            const result = await this.service.guess(user.id, String(driverId), isAdmin);
            res.status(200).json({ status: "success", ...result });
        } catch (e) {
            next(e);
        }
    };
}
