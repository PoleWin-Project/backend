import { Op, literal, col, fn } from "sequelize";
import { DirectMessageModel, UserModel, ProfileModel } from "../../database/models";
import { ListDmsQuery } from "./dms.dto";

const senderAttrs = ["id", "username"];
const profileAttrs = ["avatarUrl", "displayName"];

export class DmsRepository {
    create(senderId: number, receiverId: number, content: string) {
        return DirectMessageModel.create({ senderId, receiverId, content });
    }

    async listConversation(userId: number, otherId: number, query: ListDmsQuery) {
        const where: any = {
            [Op.or]: [
                { senderId: userId,  receiverId: otherId },
                { senderId: otherId, receiverId: userId },
            ],
        };
        if (query.before !== undefined) {
            where.id = { [Op.lt]: query.before };
        }

        const rows = await DirectMessageModel.findAll({
            where,
            include: [
                { model: UserModel, as: "sender",   attributes: senderAttrs, include: [{ model: ProfileModel, as: "profile", attributes: profileAttrs }] },
            ],
            order: [["createdAt", "DESC"], ["id", "DESC"]],
            limit: query.limit,
        });
        return rows.reverse();
    }

    // Returns one row per distinct conversation partner, with latest message
    async listConversations(userId: number): Promise<any[]> {
        // Get latest message per partner using raw Sequelize
        const rows = await DirectMessageModel.findAll({
            where: {
                [Op.or]: [{ senderId: userId }, { receiverId: userId }],
            },
            include: [
                { model: UserModel, as: "sender",   attributes: senderAttrs, include: [{ model: ProfileModel, as: "profile", attributes: profileAttrs }] },
                { model: UserModel, as: "receiver", attributes: senderAttrs, include: [{ model: ProfileModel, as: "profile", attributes: profileAttrs }] },
            ],
            order: [["createdAt", "DESC"]],
        });

        // De-duplicate per partner
        const seen = new Set<number>();
        const conversations: any[] = [];
        for (const msg of rows) {
            const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            if (!seen.has(partnerId)) {
                seen.add(partnerId);
                conversations.push({
                    partnerId,
                    partner: msg.senderId === userId ? msg.receiver : msg.sender,
                    lastMessage: msg,
                });
            }
        }
        return conversations;
    }

    async markRead(userId: number, senderId: number) {
        await DirectMessageModel.update(
            { isRead: true },
            { where: { senderId, receiverId: userId, isRead: false } }
        );
    }

    countUnread(userId: number) {
        return DirectMessageModel.count({
            where: { receiverId: userId, isRead: false },
        });
    }
}
