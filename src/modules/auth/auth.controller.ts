import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
    constructor(private readonly authService = new AuthService()) {}

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.register(req.body);
            if (!result.ok)
                return res
                    .status(400)
                    .json({ status: "error", message: result.error });
            return res.status(201).json(result);
        } catch (e) {
            next(e);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.login(req.body);
            if (!result.ok)
                return res
                    .status(401)
                    .json({ status: "error", message: result.error });
            return res.json(result);
        } catch (e) {
            next(e);
        }
    };

    verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = String(req.query.token || "");
            const result = await this.authService.verifyEmail(token);
            if (!result.ok)
                return res
                    .status(400)
                    .json({ status: "error", message: result.error });
            return res.json({ status: "ok" });
        } catch (e) {
            next(e);
        }
    };

    resendVerifyEmail = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const userId = req.user!.id;
            const result = await this.authService.resendVerifyEmail(userId);
            if (!result.ok)
                return res
                    .status(400)
                    .json({ status: "error", message: result.error });
            return res.json(result);
        } catch (e) {
            next(e);
        }
    };

    deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { password } = req.body || {};
            const result = await this.authService.deleteAccount(
                userId,
                password
            );
            if (!result.ok)
                return res
                    .status(400)
                    .json({ status: "error", message: result.error });
            return res.json({ status: "ok" });
        } catch (e) {
            next(e);
        }
    };
}