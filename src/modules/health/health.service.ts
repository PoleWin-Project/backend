import { getDbClient } from "../../database/pg.client";
import { appVersion } from "../../config/version";

export function getHealth() {
    const mem = process.memoryUsage();
    return {
        status: "ok",
        service: "PoleWin API",
        version: appVersion,
        uptimeSec: Math.floor(process.uptime()),
        memory: {
            heapUsedMb:  Math.round(mem.heapUsed  / 1024 / 1024),
            heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
            rssMb:       Math.round(mem.rss       / 1024 / 1024),
        },
        timestamp: new Date().toISOString(),
    };
}

export async function dbCheck() {
    const client = getDbClient();
    if (!client) {
        return { ok: false as const, error: "Database not connected" };
    }

    try {
        const result = await client.query("SELECT NOW() as now");
        return { ok: true as const, now: result.rows[0].now };
    } catch (error: any) {
        return {
            ok: false as const,
            error: error?.message ?? "Database query failed",
        };
    }
}
