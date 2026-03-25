import { EventEmitter } from "events";

interface ChatMessage {
    id:        number;
    channelId: number;
    senderId:  number;
    content:   string;
    createdAt: Date;
    sender?:   { id: number; username: string } | null;
}

class ChatLiveService {
    private readonly emitters  = new Map<number, EventEmitter>();
    private readonly refCounts = new Map<number, number>();

    subscribe(channelId: number): EventEmitter {
        if (!this.emitters.has(channelId)) {
            this.emitters.set(channelId, new EventEmitter());
            this.refCounts.set(channelId, 0);
        }
        this.refCounts.set(channelId, (this.refCounts.get(channelId) ?? 0) + 1);
        return this.emitters.get(channelId)!;
    }

    unsubscribe(channelId: number): void {
        const count = Math.max(0, (this.refCounts.get(channelId) ?? 1) - 1);
        this.refCounts.set(channelId, count);
        if (count === 0) {
            this.emitters.delete(channelId);
            this.refCounts.delete(channelId);
        }
    }

    publish(channelId: number, message: ChatMessage): void {
        this.emitters.get(channelId)?.emit("message", message);
    }
}

export const chatLiveService = new ChatLiveService();
