import { Request, Response } from "express";

export function notFound(req: Request, res: Response) {
    res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Route not found" });
}
