import { httpErrors } from "../../common/errors/http";
import { UserModel } from "../../database/models";
import { FriendsRepository } from "./friends.repository";

export class FriendsService {
    constructor(private readonly repo = new FriendsRepository()) {}

    async sendRequest(senderId: number, receiverId: number) {
        if (senderId === receiverId) {
            throw httpErrors.badRequest("Cannot send a friend request to yourself");
        }

        const receiver = await UserModel.findByPk(receiverId, { attributes: ["id"] });
        if (!receiver) throw httpErrors.notFound("User not found");

        const existing = await this.repo.findBetween(senderId, receiverId);
        if (existing) {
            if (existing.status === "accepted") {
                throw httpErrors.conflict("Already friends");
            }
            if (existing.status === "pending") {
                // If the other user already sent a request, auto-accept it
                if (existing.senderId === receiverId) {
                    return this.repo.updateStatus(existing.id, "accepted");
                }
                throw httpErrors.conflict("Friend request already sent");
            }
            // declined: allow resend by deleting old and creating new
            await this.repo.delete(existing.id);
        }

        return this.repo.create(senderId, receiverId);
    }

    async respond(requestId: number, userId: number, action: "accept" | "decline") {
        const request = await this.repo.findById(requestId);
        if (!request) throw httpErrors.notFound("Friend request not found");
        if (request.receiverId !== userId) throw httpErrors.forbidden("Not your request");
        if (request.status !== "pending") throw httpErrors.badRequest("Request already resolved");

        return this.repo.updateStatus(requestId, action === "accept" ? "accepted" : "declined");
    }

    async cancelRequest(requestId: number, userId: number) {
        const request = await this.repo.findById(requestId);
        if (!request) throw httpErrors.notFound("Friend request not found");
        if (request.senderId !== userId) throw httpErrors.forbidden("Not your request");
        await this.repo.delete(requestId);
    }

    async unfriend(userId: number, friendId: number) {
        const existing = await this.repo.findBetween(userId, friendId);
        if (!existing || existing.status !== "accepted") {
            throw httpErrors.notFound("Friendship not found");
        }
        await this.repo.delete(existing.id);
    }

    listIncoming(userId: number)  { return this.repo.listIncoming(userId); }
    listOutgoing(userId: number)  { return this.repo.listOutgoing(userId); }
    listFriends(userId: number)   { return this.repo.listFriends(userId); }

    async getStatus(userId: number, otherUserId: number) {
        if (userId === otherUserId) return { status: "self" as const };
        const req = await this.repo.findBetween(userId, otherUserId);
        if (!req) return { status: "none" as const };
        return {
            status: req.status as "pending" | "accepted" | "declined",
            requestId: req.id,
            isSender: req.senderId === userId,
        };
    }
}
