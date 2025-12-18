import { Request, Response, NextFunction } from "express";
import { UsersService } from "./users.service";

export class UsersController {
    constructor(private readonly service = new UsersService()) {}

    me = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.service.getMe(req.user!.id);
            res.json({ status: "ok", user });
        } catch (e) {
            next(e);
        }
    };

    updateMe = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.service.updateMe(req.user!.id, req.body);
            res.json({ status: "ok", user });
        } catch (e) {
            next(e);
        }
    };

    publicProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.service.getPublicProfile(req.params.id);
            res.json({ status: "ok", user });
        } catch (e) {
            next(e);
        }
    };

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.listUsers(req.query as any);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    adminUpdate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.service.adminUpdateUser(
                req.params.id,
                req.body
            );
            res.json({ status: "ok", user });
        } catch (e) {
            next(e);
        }
    };
}
