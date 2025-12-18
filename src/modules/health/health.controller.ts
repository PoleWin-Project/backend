import { Request, Response } from "express";
import * as healthService from "./health.service";

export function health(req: Request, res: Response) {
    res.json(healthService.getHealth());
}

export async function dbCheck(req: Request, res: Response) {
    const result = await healthService.dbCheck();

    if (!result.ok) {
        return res.status(500).json({ status: "error", message: result.error });
    }

    return res.json({ status: "ok", time: result.now });
}
