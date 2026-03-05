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
        const queryRef = req.query as Record<string, unknown>;
        for (const key of Object.keys(queryRef)) {
            delete queryRef[key];
        }
        Object.assign(queryRef, parsed.data as Record<string, unknown>);
        next();
    };
}
