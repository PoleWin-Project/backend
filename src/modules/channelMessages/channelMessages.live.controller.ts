import { Request, Response } from "express";
import { ChatChannelModel } from "../../database/models";
import { chatLiveService } from "./channelMessages.live";

const HEARTBEAT_MS = 15_000;

export async function liveMessages(req: Request, res: Response): Promise<void> {
    const channelId = Number(req.params.channelId);

    // Verify channel exists before opening the SSE stream
    const channel = await ChatChannelModel.findByPk(channelId, { attributes: ["id"] });
    if (!channel) {
        res.status(404).json({ status: "error", message: "Chat channel not found" });
        return;
    }

    // SSE headers
    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
    res.flushHeaders();

    const emitter = chatLiveService.subscribe(channelId);

    const sendMessage = (data: unknown) => {
        res.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
    };

    emitter.on("message", sendMessage);

    // Heartbeat to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
        res.write(":heartbeat\n\n");
    }, HEARTBEAT_MS);

    req.on("close", () => {
        clearInterval(heartbeat);
        emitter.off("message", sendMessage);
        chatLiveService.unsubscribe(channelId);
    });
}
