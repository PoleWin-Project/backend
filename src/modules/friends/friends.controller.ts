import { NextFunction, Request, Response } from "express";
import { FriendsService } from "./friends.service";

export class FriendsController {
    constructor(private readonly service = new FriendsService()) {}

    sendRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const senderId    = req.user!.id;
            const receiverId  = Number(req.body.receiverId);
            const request = await this.service.sendRequest(senderId, receiverId);
            res.status(201).json({ status: "ok", request });
        } catch (e) { next(e); }
    };

    respond = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId    = req.user!.id;
            const requestId = Number(req.params.id);
            const { action } = req.body as { action: "accept" | "decline" };
            const request = await this.service.respond(requestId, userId, action);
            res.json({ status: "ok", request });
        } catch (e) { next(e); }
    };

    cancelRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId    = req.user!.id;
            const requestId = Number(req.params.id);
            await this.service.cancelRequest(requestId, userId);
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
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };
}
