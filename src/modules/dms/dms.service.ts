import { httpErrors } from "../../common/errors/http";
import { UserModel } from "../../database/models";
import { FriendsRepository } from "../friends/friends.repository";
import { DmsRepository } from "./dms.repository";
import { ListDmsQuery, SendDmInput } from "./dms.dto";

export class DmsService {
    constructor(
        private readonly repo        = new DmsRepository(),
        private readonly friendsRepo = new FriendsRepository(),
    ) {}

    async send(senderId: number, receiverId: number, input: SendDmInput) {
        if (senderId === receiverId) throw httpErrors.badRequest("Cannot message yourself");

        const receiver = await UserModel.findByPk(receiverId, { attributes: ["id"] });
        if (!receiver) throw httpErrors.notFound("User not found");

        const areFriends = await this.friendsRepo.areFriends(senderId, receiverId);
        if (!areFriends) throw httpErrors.forbidden("You must be friends to send a message");

        return this.repo.create(senderId, receiverId, input.content);
    }

    listConversation(userId: number, otherId: number, query: ListDmsQuery) {
        return this.repo.listConversation(userId, otherId, query);
    }

    listConversations(userId: number) {
        return this.repo.listConversations(userId);
    }

    markRead(userId: number, senderId: number) {
        return this.repo.markRead(userId, senderId);
    }

    countUnread(userId: number) {
        return this.repo.countUnread(userId);
    }
}
