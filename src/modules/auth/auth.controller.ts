import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { withLinks, registerLinks, loginLinks } from "../../common/utils/hateoas";

export class AuthController {
    constructor(private readonly authService = new AuthService()) {}

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.register(req.body);
            if (!result.ok)
                return res
                    .status(400)
                    .json({ status: "error", message: result.error });
            return res.status(201).json(withLinks(result, registerLinks));
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
            return res.json(withLinks(result, loginLinks));
        } catch (e) {
            next(e);
        }
    };

    refresh = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refresh(refreshToken);
            if (!result.ok)
                return res
                    .status(401)
                    .json({ status: "error", message: result.error });
            return res.json(withLinks(result, {
                self: { href: "/api/v1/auth/refresh", method: "POST" as const },
                me:   { href: "/api/v1/users/me",     method: "GET" as const },
            }));
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
            return res.json(withLinks({ status: "ok" }, {
                self:  { href: "/api/v1/auth/verify-email", method: "GET" as const },
                login: { href: "/api/v1/auth/login",        method: "POST" as const },
                me:    { href: "/api/v1/users/me",          method: "GET" as const },
            }));
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
            return res.json(withLinks(result, {
                self: { href: "/api/v1/auth/resend-verify-email", method: "POST" as const },
                me:   { href: "/api/v1/users/me",                 method: "GET" as const },
            }));
        } catch (e) {
            next(e);
        }
    };

    changePassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { currentPassword, newPassword } = req.body;
            const result = await this.authService.changePassword(userId, currentPassword, newPassword);
            if (!result.ok)
                return res
                    .status(400)
                    .json({ status: "error", message: result.error });
            return res.json(withLinks({ status: "ok" }, {
                self: { href: "/api/v1/auth/change-password", method: "POST" as const },
                me:   { href: "/api/v1/users/me",             method: "GET" as const },
            }));
        } catch (e) {
            next(e);
        }
    };

    forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;
            await this.authService.forgotPassword(email);
            return res.json(withLinks({ status: "ok" }, {
                self:         { href: "/api/v1/auth/forgot-password", method: "POST" as const },
                resetPassword: { href: "/api/v1/auth/reset-password", method: "POST" as const },
            }));
        } catch (e) {
            next(e);
        }
    };

    resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token, newPassword } = req.body;
            const result = await this.authService.resetPassword(token, newPassword);
            if (!result.ok)
                return res
                    .status(400)
                    .json({ status: "error", message: result.error });
            return res.json(withLinks({ status: "ok" }, {
                self:  { href: "/api/v1/auth/reset-password", method: "POST" as const },
                login: { href: "/api/v1/auth/login",          method: "POST" as const },
            }));
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
            return res.json(withLinks({ status: "ok" }, {
                register: { href: "/api/v1/auth/register", method: "POST" as const },
                login:    { href: "/api/v1/auth/login",    method: "POST" as const },
            }));
        } catch (e) {
            next(e);
        }
    };

    me = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const result = await this.authService.me(userId);
            if (!result.ok)
                return res
                    .status(404)
                    .json({ status: "error", message: result.error });
            return res.json(result);
        } catch (e) {
            next(e);
        }
    };
}
