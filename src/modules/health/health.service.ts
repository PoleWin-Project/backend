import { getDbClient } from "../../database/pg.client";

export function getHealth() {
    return { status: "ok", service: "PoleWin backend Express" };
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
