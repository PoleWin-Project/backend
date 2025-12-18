import { NextFunction, Request, Response } from "express";
import { httpErrors } from "../errors/http";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
    if (!req.user) return next(httpErrors.unauthorized("Missing auth"));
    next();
}

export function requireRole(...roles: string[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) return next(httpErrors.unauthorized("Missing auth"));
        const ok = roles.some((r) => req.user!.roles.includes(r));
        if (!ok) return next(httpErrors.forbidden("Insufficient role"));
        next();
    };
}
