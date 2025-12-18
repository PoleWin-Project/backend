import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export function errorHandler(
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    if (err instanceof AppError) {
        return res
            .status(err.statusCode)
            .json({ status: "error", code: err.code, message: err.message });
    }
    console.error(err);
    return res
        .status(500)
        .json({
            status: "error",
            code: "INTERNAL_ERROR",
            message: "Internal server error",
        });
}
