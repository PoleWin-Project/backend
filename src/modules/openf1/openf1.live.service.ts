import { EventEmitter } from "events";
import { openf1Client } from "../../common/clients/openf1.client";
import {
    OpenF1Interval,
    OpenF1Lap,
    OpenF1Position,
    OpenF1RaceControl,
    OpenF1Session,
} from "./openf1.types";

const POLL_MS = {
    session:      30_000,
    raceControl:   5_000,
    positions:     5_000,
    laps:         10_000,
    intervals:    10_000,
} as const;

export type LiveStream = keyof typeof POLL_MS;

export interface LiveSessionPayload    { session:      OpenF1Session | null }
export interface LiveRaceControlPayload { events:      OpenF1RaceControl[] }
export interface LivePositionsPayload  { positions:    OpenF1Position[] }
export interface LiveLapsPayload       { laps:         OpenF1Lap[] }
export interface LiveIntervalsPayload  { intervals:    OpenF1Interval[] }

export type LivePayload<S extends LiveStream> =
    S extends "session"     ? LiveSessionPayload     :
    S extends "raceControl" ? LiveRaceControlPayload :
    S extends "positions"   ? LivePositionsPayload   :
    S extends "laps"        ? LiveLapsPayload        :
    LiveIntervalsPayload;

export class OpenF1LiveService extends EventEmitter {
    private pollers   = new Map<LiveStream, NodeJS.Timeout>();
    private refCount  = new Map<LiveStream, number>();
    private cache     = new Map<LiveStream, LivePayload<LiveStream>>();

    private lastRaceControlDate: string | null = null;
    private lastPositionDate:    string | null = null;
    private lastLapDate:         string | null = null;
    private lastIntervalDate:    string | null = null;

    subscribe(stream: LiveStream): void {
        const count = (this.refCount.get(stream) ?? 0) + 1;
        this.refCount.set(stream, count);
        if (count === 1) this.startPoller(stream);
    }

    unsubscribe(stream: LiveStream): void {
        const count = Math.max(0, (this.refCount.get(stream) ?? 1) - 1);
        this.refCount.set(stream, count);
        if (count === 0) this.stopPoller(stream);
    }

    getLastPayload<S extends LiveStream>(stream: S): LivePayload<S> | undefined {
        return this.cache.get(stream) as LivePayload<S> | undefined;
    }

    private publish(event: LiveStream, payload: LivePayload<LiveStream>): void {
        this.cache.set(event, payload);
        super.emit(event, payload);
    }

    private startPoller(stream: LiveStream): void {
        const poll = this.getPollFn(stream);
        poll();
        const timer = setInterval(poll, POLL_MS[stream]);
        this.pollers.set(stream, timer);
    }

    private stopPoller(stream: LiveStream): void {
        const timer = this.pollers.get(stream);
        if (timer) {
            clearInterval(timer);
            this.pollers.delete(stream);
        }
    }

    private getPollFn(stream: LiveStream): () => void {
        switch (stream) {
            case "session":     return () => void this.pollSession();
            case "raceControl": return () => void this.pollRaceControl();
            case "positions":   return () => void this.pollPositions();
            case "laps":        return () => void this.pollLaps();
            case "intervals":   return () => void this.pollIntervals();
        }
    }

    private async pollSession(): Promise<void> {
        try {
            const results = await openf1Client.get<OpenF1Session[]>("/sessions", { session_key: "latest" });
            this.publish("session", { session: results[0] ?? null });
        } catch { /* ignore poll errors */ }
    }

    private async pollRaceControl(): Promise<void> {
        try {
            const filters = this.lastRaceControlDate
                ? [`date>${this.lastRaceControlDate}`]
                : undefined;

            const all = await openf1Client.get<OpenF1RaceControl[]>("/race_control", { session_key: "latest" }, filters);
            const newEvents = this.lastRaceControlDate
                ? all.filter(e => e.date > this.lastRaceControlDate!)
                : all;

            if (newEvents.length > 0) {
                this.lastRaceControlDate = newEvents[newEvents.length - 1].date;
                this.publish("raceControl", { events: newEvents });
            }
        } catch { /* ignore poll errors */ }
    }

    private async pollPositions(): Promise<void> {
        try {
            const filters = this.lastPositionDate
                ? [`date>${this.lastPositionDate}`]
                : undefined;

            const all = await openf1Client.get<OpenF1Position[]>("/position", { session_key: "latest" }, filters);
            if (all.length === 0) return;

            this.lastPositionDate = all[all.length - 1].date;

            const latest = new Map<number, OpenF1Position>();
            for (const p of all) latest.set(p.driver_number, p);

            this.publish("positions", {
                positions: [...latest.values()].sort((a, b) => a.position - b.position),
            });
        } catch { /* ignore poll errors */ }
    }

    private async pollLaps(): Promise<void> {
        try {
            const filters = this.lastLapDate
                ? [`date_start>${this.lastLapDate}`]
                : undefined;

            const all = await openf1Client.get<OpenF1Lap[]>("/laps", { session_key: "latest" }, filters);
            const newLaps = this.lastLapDate
                ? all.filter(l => l.date_start > this.lastLapDate!)
                : all;

            if (newLaps.length > 0) {
                this.lastLapDate = newLaps[newLaps.length - 1].date_start;
                this.publish("laps", { laps: newLaps });
            }
        } catch { /* ignore poll errors */ }
    }

    private async pollIntervals(): Promise<void> {
        try {
            const filters = this.lastIntervalDate
                ? [`date>${this.lastIntervalDate}`]
                : undefined;

            const all = await openf1Client.get<OpenF1Interval[]>("/intervals", { session_key: "latest" }, filters);
            if (all.length === 0) return;

            this.lastIntervalDate = all[all.length - 1].date;

            const latest = new Map<number, OpenF1Interval>();
            for (const i of all) latest.set(i.driver_number, i);

            this.publish("intervals", {
                intervals: [...latest.values()].sort((a, b) => (a.gap_to_leader ?? 0) - (b.gap_to_leader ?? 0)),
            });
        } catch { /* ignore poll errors */ }
    }
}

export const openf1LiveService = new OpenF1LiveService();
