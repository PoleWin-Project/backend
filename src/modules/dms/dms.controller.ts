import { NextFunction, Request, Response } from "express";
import { DmsService } from "./dms.service";
import { ListDmsQuery } from "./dms.dto";
import { emitToUser } from "../../socket/ws.handler";
import { notifyUser } from "../push/push.service";
import { UserModel } from "../../database/models";

export class DmsController {
    constructor(private readonly service = new DmsService()) {}

    send = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const senderId   = req.user!.id;
            const receiverId = Number(req.params.userId);
            const message    = await this.service.send(senderId, receiverId, req.body);

            // Push to recipient via native WebSocket
            emitToUser(receiverId, "dm:received", {
                id:         message.id,
                senderId:   message.senderId,
                receiverId: message.receiverId,
                content:    message.content,
                isRead:     message.isRead,
                createdAt:  message.createdAt,
            });

            // Notification push système — titre = nom de l'expéditeur (façon messagerie).
            const sender = await UserModel.findByPk(senderId, { attributes: ["username"] });
            const senderName = sender?.username ?? "Nouveau message";
            void notifyUser(receiverId, {
                title: senderName,
                body: message.content.length > 120 ? `${message.content.slice(0, 117)}...` : message.content,
                data: { type: "dm", userId: senderId },
            });

            res.status(201).json({ status: "ok", message });
        } catch (e) { next(e); }
    };

    listConversation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId  = req.user!.id;
            const otherId = Number(req.params.userId);
            // Mark their messages as read
            await this.service.markRead(userId, otherId);
            const messages = await this.service.listConversation(userId, otherId, req.query as unknown as ListDmsQuery);
            res.json({ status: "ok", messages });
        } catch (e) { next(e); }
    };

    listConversations = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const items = await this.service.listConversations(req.user!.id);
            res.json({ status: "ok", items });
        } catch (e) { next(e); }
    };

    unreadCount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const count = await this.service.countUnread(req.user!.id);
            res.json({ status: "ok", count });
        } catch (e) { next(e); }
    };
}
