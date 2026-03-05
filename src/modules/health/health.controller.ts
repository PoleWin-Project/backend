import { Request, Response } from "express";
import * as healthService from "./health.service";
import { appVersion, appName } from "../../config/version";
import { env } from "../../config/env";

export function health(_req: Request, res: Response) {
    res.json(healthService.getHealth());
}

export async function dbCheck(_req: Request, res: Response) {
    const result = await healthService.dbCheck();

    if (!result.ok) {
        return res.status(500).json({ status: "error", message: result.error });
    }

    return res.json({ status: "ok", time: result.now });
}

export function version(_req: Request, res: Response) {
    res.json({
        status:  "ok",
        name:    appName,
        version: appVersion,
        env:     env.nodeEnv,
        api:     "v1",
    });
}
