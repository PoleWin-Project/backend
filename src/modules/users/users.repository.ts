import { Op, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { UserModel, ProfileModel } from "../../database/models";
import { ListUsersQuery } from "./users.dto";

export class UsersRepository {
    async findById(userId: string, tx?: Transaction) {
        return UserModel.findByPk(userId, {
            transaction: tx,
            attributes: { exclude: ["passwordHash"] as any },
            include: [{ model: ProfileModel, as: "profile" }],
        });
    }

    async findPublicById(userId: string) {
        return UserModel.findOne({
            where: { id: userId },
            attributes: ["id", "username", "createdAt"],
            include: [
                {
                    model: ProfileModel,
                    as: "profile",
                    where: { isProfilePublic: true },
                    required: true,
                    attributes: [
                        "displayName",
                        "avatarUrl",
                        "bio",
                        "points",
                        "favoriteTeamCode",
                        "favoriteDriverCode",
                        "timeZone",
                        "isProfilePublic",
                    ],
                },
            ],
        });
    }

    async list(query: ListUsersQuery) {
        const where: any = {};

        if (query.q) {
            where[Op.or] = [
                { email: { [Op.iLike]: `%${query.q}%` } },
                { username: { [Op.iLike]: `%${query.q}%` } },
            ];
        }

        return UserModel.findAndCountAll({
            where,
            limit: query.limit,
            offset: query.offset,
            order: [["createdAt", "DESC"]],
            attributes: ["id", "email", "username", "createdAt", "lastLoginAt"],
        });
    }

    async updateMe(userId: string, patch: any) {
        return sequelize.transaction(async (tx) => {
            const user = await UserModel.findByPk(userId, { transaction: tx });
            if (!user) return null;

            const userUpdates: any = {};
            if (patch.username !== undefined) userUpdates.username = patch.username;

            if (Object.keys(userUpdates).length) {
                await user.update(userUpdates, { transaction: tx });
            }

            if (patch.profile) {
                await this.upsertProfile(userId, patch.profile, tx);
            }

            return this.findById(userId, tx);
        });
    }

    private async upsertProfile(userId: string, profilePatch: any, tx: Transaction) {
        const existing = await ProfileModel.findOne({
            where: { userId },
            transaction: tx,
        });

        if (existing) {
            await existing.update(profilePatch, { transaction: tx });
            return existing;
        }

        return ProfileModel.create({ userId, ...profilePatch }, { transaction: tx });
    }

    async adminUpdateUser(userId: string, patch: any) {
        return sequelize.transaction(async (tx) => {
            const user = await UserModel.findByPk(userId, { transaction: tx });
            if (!user) return null;

            const updates: any = {};
            if (patch.email !== undefined) updates.email = patch.email;
            if (patch.username !== undefined) updates.username = patch.username;

            if (Object.keys(updates).length) {
                await user.update(updates, { transaction: tx });
            }

            if (patch.profile) {
                await this.upsertProfile(userId, patch.profile, tx);
            }

            return this.findById(userId, tx);
        });
    }

    async usernameExists(username: string, excludeUserId?: string) {
        const where: any = { username };
        if (excludeUserId) where.id = { [Op.ne]: excludeUserId };
        const count = await UserModel.count({ where });
        return count > 0;
    }

    async emailExists(email: string, excludeUserId?: string) {
        const where: any = { email };
        if (excludeUserId) where.id = { [Op.ne]: excludeUserId };
        const count = await UserModel.count({ where });
        return count > 0;
    }
}
