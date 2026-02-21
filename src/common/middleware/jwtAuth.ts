import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import type { AuthUser } from "../security/auth.types";

export function jwtAuth(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next();

    const token = header.slice(7);
    const payload = verifyAccessToken<AuthUser>(token);
    if (payload) {
        req.user = payload;
    }
    next();
}
