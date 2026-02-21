import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "../../config/logger";

export function errorHandler(
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    if (err instanceof AppError) {
        if (err.statusCode >= 500) logger.error({ err }, err.message);
        else logger.warn({ code: err.code, status: err.statusCode }, err.message);
        return res
            .status(err.statusCode)
            .json({ status: "error", code: err.code, message: err.message });
    }
    logger.error({ err }, "Unexpected error");
    return res
        .status(500)
        .json({
            status: "error",
            code: "INTERNAL_ERROR",
            message: "Internal server error",
        });
}
