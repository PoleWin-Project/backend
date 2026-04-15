import { EventEmitter } from "events";
import { Request, Response } from "express";
import { openf1LiveService, LiveStream, LivePayload } from "./openf1.live.service";

const HEARTBEAT_MS = 15_000;

function initSSE(res: Response): void {
    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
}

function sendEvent(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function createSSEHandler<S extends LiveStream>(
    stream: S,
    sseEvent: string,
    transform: (payload: LivePayload<S>) => unknown,
) {
    return (req: Request, res: Response) => {
        initSSE(res);

        const cached = openf1LiveService.getLastPayload(stream);
        if (cached) sendEvent(res, sseEvent, transform(cached));

        const handler = (payload: LivePayload<S>) => sendEvent(res, sseEvent, transform(payload));

        openf1LiveService.subscribe(stream);
        (openf1LiveService as unknown as EventEmitter).on(stream, handler);

        const heartbeat = setInterval(() => res.write(":heartbeat\n\n"), HEARTBEAT_MS);

        req.on("close", () => {
            clearInterval(heartbeat);
            (openf1LiveService as unknown as EventEmitter).off(stream, handler);
            openf1LiveService.unsubscribe(stream);
        });
    };
}

export const liveSession = createSSEHandler(
    "session",
    "session",
    (p) => p.session,
);

export const liveRaceControl = createSSEHandler(
    "raceControl",
    "race_control",
    (p) => p.events,
);

export const livePositions = createSSEHandler(
    "positions",
    "positions",
    (p) => p.positions,
);

export const liveLaps = createSSEHandler(
    "laps",
    "laps",
    (p) => p.laps,
);

export const liveIntervals = createSSEHandler(
    "intervals",
    "intervals",
    (p) => p.intervals,
);

export const liveLocation = createSSEHandler(
    "locations",
    "locations",
    (p) => p.locations,
);
