import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";
import { httpErrors } from "../errors/http";

/**
 * N'expose jamais la structure interne de Zod au client. Le premier message
 * décrit déjà précisément le champ invalide et peut être affiché tel quel.
 */
function validationMessage(error: ZodError): string {
    return error.issues[0]?.message ?? "Les informations saisies sont invalides.";
}

export function validateBody(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return next(
                httpErrors.unprocessableEntity(validationMessage(parsed.error), "VALIDATION_ERROR")
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
                httpErrors.unprocessableEntity(validationMessage(parsed.error), "VALIDATION_ERROR")
            );
        const queryRef = req.query as Record<string, unknown>;
        for (const key of Object.keys(queryRef)) {
            delete queryRef[key];
        }
        Object.assign(queryRef, parsed.data as Record<string, unknown>);
        next();
    };
}
