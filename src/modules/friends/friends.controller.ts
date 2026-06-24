import { NextFunction, Request, Response } from "express";
import { FriendsService } from "./friends.service";
import { emitToUser } from "../../socket/ws.handler";
import { notifyUser } from "../push/push.service";
import { UserModel } from "../../database/models";

export class FriendsController {
    constructor(private readonly service = new FriendsService()) {}

    sendRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const senderId    = req.user!.id;
            const receiverId  = Number(req.body.receiverId);
            const request = await this.service.sendRequest(senderId, receiverId);

            // Notify both users that friendship status changed
            emitToUser(receiverId, "friend:status_changed", { userId: senderId });
            emitToUser(senderId, "friend:status_changed", { userId: receiverId });

            // Push système : prévenir le destinataire selon le résultat
            const sender = await UserModel.findByPk(senderId, { attributes: ["username"] });
            const senderName = sender?.username ?? "Quelqu'un";
            if (request?.status === "accepted") {
                // L'autre avait déjà envoyé une demande → on a auto-accepté la sienne.
                // On prévient l'expéditeur d'origine (= receiverId) que c'est validé.
                void notifyUser(receiverId, {
                    title: "Nouvelle relation",
                    body: `${senderName} a accepté ta demande d'ami 🎉`,
                    data: { type: "friend", userId: senderId },
                });
            } else if (request) {
                // Nouvelle demande en attente → on prévient le destinataire.
                void notifyUser(receiverId, {
                    title: "Nouvelle demande d'ami",
                    body: `${senderName} souhaite t'ajouter en ami 👋`,
                    data: { type: "friend", userId: senderId },
                });
            }

            res.status(201).json({ status: "ok", request });
        } catch (e) { next(e); }
    };

    respond = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId    = req.user!.id;
            const requestId = Number(req.params.id);
            const { action } = req.body as { action: "accept" | "decline" };
            const request = await this.service.respond(requestId, userId, action);
            
            // Notify the original sender that their request was responded to
            // request.senderId might not be returned directly, wait we need to check if request has senderId.
            // Let's look at the return type of respond. It probably returns the request object which has senderId and receiverId.
            if (request && request.senderId) {
                emitToUser(request.senderId, "friend:status_changed", { userId: userId });
                emitToUser(userId, "friend:status_changed", { userId: request.senderId });

                // Push système : prévenir l'expéditeur que sa demande est acceptée
                if (action === "accept") {
                    void notifyUser(request.senderId, {
                        title: "Nouvelle relation",
                        body: "Ta demande d'ami a été acceptée 🎉",
                        data: { type: "friend", userId },
                    });
                }
            }

            res.json({ status: "ok", request });
        } catch (e) { next(e); }
    };

    cancelRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId    = req.user!.id;
            const requestId = Number(req.params.id);
            await this.service.cancelRequest(requestId, userId);
            
            // We ideally need the receiverId to notify them, but since we just cancelled it, 
            // the receiver might not know unless we fetch it. We'll emit just in case if we had the ID.
            // For now, emitting to self to trigger refresh.
            emitToUser(userId, "friend:status_changed", { userId: null });
            
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };

    listIncoming = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const items = await this.service.listIncoming(req.user!.id);
            res.json({ status: "ok", items });
        } catch (e) { next(e); }
    };

    listOutgoing = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const items = await this.service.listOutgoing(req.user!.id);
            res.json({ status: "ok", items });
        } catch (e) { next(e); }
    };

    listFriends = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const items = await this.service.listFriends(req.user!.id);
            res.json({ status: "ok", items });
        } catch (e) { next(e); }
    };

    getStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId      = req.user!.id;
            const otherUserId = Number(req.params.userId);
            const result = await this.service.getStatus(userId, otherUserId);
            res.json({ status: "ok", friendship: result });
        } catch (e) { next(e); }
    };

    unfriend = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId   = req.user!.id;
            const friendId = Number(req.params.userId);
            await this.service.unfriend(userId, friendId);
            
            emitToUser(friendId, "friend:status_changed", { userId: userId });
            emitToUser(userId, "friend:status_changed", { userId: friendId });
            
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };
}
