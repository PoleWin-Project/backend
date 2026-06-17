import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { PushRepository } from "./push.repository";
import { logger } from "../../config/logger";

const expo = new Expo();
const repo = new PushRepository();

export interface PushPayload {
    title: string;
    body: string;
    /** Données arbitraires utilisées côté app pour le deep-link (ex: { type: "dm", userId }). */
    data?: Record<string, unknown>;
}

/**
 * Envoie une notification push à tous les appareils d'un utilisateur.
 * Best-effort : ne jette jamais — un échec d'envoi ne doit pas casser l'action métier.
 */
export async function notifyUser(userId: number, payload: PushPayload): Promise<void> {
    try {
        const tokens = await repo.getTokensForUser(userId);
        await sendToTokens(tokens, payload);
    } catch (err) {
        logger.error({ err, userId }, "push: notifyUser failed");
    }
}

/**
 * Diffuse une notification push à TOUS les utilisateurs ayant un appareil enregistré.
 * Utilisé pour les annonces globales (ex: début d'une session). Best-effort.
 */
export async function broadcastToAll(payload: PushPayload): Promise<void> {
    try {
        const tokens = await repo.getAllTokens();
        await sendToTokens(tokens, payload);
    } catch (err) {
        logger.error({ err }, "push: broadcastToAll failed");
    }
}

/** Envoie un payload à une liste de tokens, en nettoyant les invalides. */
async function sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
    const valid = tokens.filter((t) => Expo.isExpoPushToken(t));

    // Nettoie les tokens manifestement invalides.
    for (const t of tokens) {
        if (!Expo.isExpoPushToken(t)) await repo.removeInvalid(t);
    }
    if (valid.length === 0) return;

    const messages: ExpoPushMessage[] = valid.map((to) => ({
        to,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            await handleTickets(chunk, tickets);
        } catch (err) {
            logger.error({ err }, "push: chunk send failed");
        }
    }
}

/** Supprime les tokens rejetés par Expo (appareil désinstallé / token périmé). */
async function handleTickets(chunk: ExpoPushMessage[], tickets: ExpoPushTicket[]) {
    for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
            const msg = chunk[i];
            const to = Array.isArray(msg.to) ? msg.to[0] : msg.to;
            if (to) await repo.removeInvalid(to);
        }
    }
}

export class PushService {
    constructor(private readonly repo = new PushRepository()) {}

    registerToken(userId: number, token: string, platform?: string | null) {
        return this.repo.upsert(userId, token, platform);
    }

    removeToken(token: string) {
        return this.repo.remove(token);
    }
}
