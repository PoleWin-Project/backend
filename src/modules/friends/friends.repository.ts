import { Op } from "sequelize";
import { FriendRequestModel, UserModel, ProfileModel } from "../../database/models";
import { FriendRequestStatus } from "../../database/models/friendRequest.model";

const userAttrs  = ["id", "username"];
const profileAttrs = ["avatarUrl", "displayName", "points"];

export class FriendsRepository {
    private include() {
        return [
            { model: UserModel, as: "sender",   attributes: userAttrs, include: [{ model: ProfileModel, as: "profile", attributes: profileAttrs }] },
            { model: UserModel, as: "receiver", attributes: userAttrs, include: [{ model: ProfileModel, as: "profile", attributes: profileAttrs }] },
        ];
    }

    findBetween(userA: number, userB: number) {
        return FriendRequestModel.findOne({
            where: {
                [Op.or]: [
                    { senderId: userA, receiverId: userB },
                    { senderId: userB, receiverId: userA },
                ],
            },
        });
    }

    findById(id: number) {
        return FriendRequestModel.findByPk(id, { include: this.include() });
    }

    create(senderId: number, receiverId: number) {
        return FriendRequestModel.create({ senderId, receiverId, status: "pending" });
    }

    async updateStatus(id: number, status: FriendRequestStatus) {
        const req = await FriendRequestModel.findByPk(id);
        if (!req) return null;
        return req.update({ status });
    }

    async delete(id: number) {
        const req = await FriendRequestModel.findByPk(id);
        if (!req) return false;
        await req.destroy();
        return true;
    }

    listIncoming(userId: number) {
        return FriendRequestModel.findAll({
            where: { receiverId: userId, status: "pending" },
            include: this.include(),
            order: [["createdAt", "DESC"]],
        });
    }

    listOutgoing(userId: number) {
        return FriendRequestModel.findAll({
            where: { senderId: userId, status: "pending" },
            include: this.include(),
            order: [["createdAt", "DESC"]],
        });
    }

    listFriends(userId: number) {
        return FriendRequestModel.findAll({
            where: {
                status: "accepted",
                [Op.or]: [{ senderId: userId }, { receiverId: userId }],
            },
            include: this.include(),
            order: [["updatedAt", "DESC"]],
        });
    }

    areFriends(userA: number, userB: number) {
        return FriendRequestModel.findOne({
            where: {
                status: "accepted",
                [Op.or]: [
                    { senderId: userA, receiverId: userB },
                    { senderId: userB, receiverId: userA },
                ],
            },
        });
    }
}
