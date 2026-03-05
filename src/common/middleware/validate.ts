import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { httpErrors } from "../errors/http";

export function validateBody(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return next(
                httpErrors.unprocessableEntity(parsed.error.message, "VALIDATION_ERROR")
            );
        req.body = parsed.data;
        next();
    };
}

export function validateQuery(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success)
            return next(
                httpErrors.unprocessableEntity(parsed.error.message, "VALIDATION_ERROR")
            );
        Object.defineProperty(req, "query", { value: parsed.data, writable: true, configurable: true });
        next();
    };
}
