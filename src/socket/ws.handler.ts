import { WebSocketServer, WebSocket } from "ws";
import { Server as HttpServer } from "http";
import { parse } from "url";
import { verifyAccessToken } from "../common/utils/jwt";
import { AuthUser } from "../common/security/auth.types";
import { logger } from "../config/logger";

// userId → set of open sockets
const userSockets = new Map<number, Set<WebSocket>>();

export function setupWsServer(httpServer: HttpServer): WebSocketServer {
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    wss.on("connection", (ws: WebSocket, req) => {
        // Auth via query param ?token=JWT
        const { query } = parse(req.url ?? "", true);
        const token = Array.isArray(query.token) ? query.token[0] : query.token;

        if (!token) {
            ws.close(4001, "Authentication required");
            return;
        }

        const payload = verifyAccessToken<AuthUser>(token);
        if (!payload) {
            ws.close(4002, "Invalid token");
            return;
        }

        const userId = payload.id;
        logger.info({ userId }, "WS client connected");

        if (!userSockets.has(userId)) userSockets.set(userId, new Set());
        userSockets.get(userId)!.add(ws);

        // Keepalive ping every 30s
        const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.ping();
        }, 30_000);

        ws.on("close", () => {
            clearInterval(pingInterval);
            userSockets.get(userId)?.delete(ws);
            if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
            logger.info({ userId }, "WS client disconnected");
        });

        ws.on("error", (err) => {
            logger.error({ err, userId }, "WS error");
        });
    });

    return wss;
}

export function emitToUser(userId: number, event: string, data: unknown) {
    const sockets = userSockets.get(userId);
    if (!sockets?.size) return;
    const payload = JSON.stringify({ type: event, data });
    for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
}
