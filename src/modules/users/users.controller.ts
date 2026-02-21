import { Request, Response, NextFunction } from "express";
import { UsersService } from "./users.service";
import { withLinks, meLinks, publicProfileLinks } from "../../common/utils/hateoas";
import { ListUsersQuery } from "./users.dto";

export class UsersController {
    constructor(private readonly service = new UsersService()) {}

    me = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const user = await this.service.getMe(userId);
            res.json(withLinks({ status: "ok", user }, meLinks(userId)));
        } catch (e) {
            next(e);
        }
    };

    updateMe = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const user = await this.service.updateMe(userId, req.body);
            res.json(withLinks({ status: "ok", user }, meLinks(userId)));
        } catch (e) {
            next(e);
        }
    };

    publicProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.service.getPublicProfile(req.params.id);
            res.json(withLinks({ status: "ok", user }, publicProfileLinks(req.params.id)));
        } catch (e) {
            next(e);
        }
    };

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.listUsers(req.query as unknown as ListUsersQuery);
            res.json({ status: "ok", ...data });
        } catch (e) {
            next(e);
        }
    };

    adminUpdate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.service.adminUpdateUser(
                Number(req.params.id),
                req.body
            );
            res.json({ status: "ok", user });
        } catch (e) {
            next(e);
        }
    };
}
