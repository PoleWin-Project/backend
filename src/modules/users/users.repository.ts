import { Op, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { RoleModel, UserModel, UserProfileModel } from "../../database/models";
import { ListUsersQuery } from "./users.dto";

export class UsersRepository {
    async findById(userId: string) {
        return UserModel.findByPk(userId, {
            attributes: { exclude: ["passwordHash"] as any },
            include: [
                { model: UserProfileModel, as: "profile" },
                { model: RoleModel, as: "roles", through: { attributes: [] } },
            ],
        });
    }

    async findPublicById(userId: string) {
        return UserModel.findOne({
            where: { id: userId, isActive: true },
            attributes: ["id", "username", "country", "language", "createdAt"],
            include: [
                {
                    model: UserProfileModel,
                    as: "profile",
                    where: { isProfilePublic: true },
                    required: true,
                    attributes: [
                        "displayName",
                        "avatarUrl",
                        "bio",
                        "favoriteTeamCode",
                        "favoriteDriverCode",
                        "timeZone",
                        "isProfilePublic",
                        "showStats",
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
            attributes: [
                "id",
                "email",
                "username",
                "isActive",
                "isEmailVerified",
                "createdAt",
                "lastLoginAt",
            ],
            include: [
                {
                    model: RoleModel,
                    as: "roles",
                    through: { attributes: [] },
                    attributes: ["name"],
                },
            ],
        });
    }

    async updateMe(userId: string, patch: any) {
        return sequelize.transaction(async (tx) => {
            const user = await UserModel.findByPk(userId, { transaction: tx });
            if (!user) return null;

            const userUpdates: any = {};
            if (patch.username !== undefined)
                userUpdates.username = patch.username;
            if (patch.country !== undefined)
                userUpdates.country = patch.country;
            if (patch.language !== undefined)
                userUpdates.language = patch.language;
            if (patch.dateOfBirth !== undefined)
                userUpdates.dateOfBirth = patch.dateOfBirth;

            if (Object.keys(userUpdates).length) {
                await user.update(userUpdates, { transaction: tx });
            }

            if (patch.profile) {
                await this.upsertProfile(userId, patch.profile, tx);
            }

            return this.findById(userId);
        });
    }

    private async upsertProfile(
        userId: string,
        profilePatch: any,
        tx: Transaction
    ) {
        const existing = await UserProfileModel.findByPk(userId, {
            transaction: tx,
        });
        if (existing) {
            await existing.update(profilePatch, { transaction: tx });
            return existing;
        }
        return UserProfileModel.create(
            { userId, ...profilePatch },
            { transaction: tx }
        );
    }

    async adminUpdateUser(userId: string, patch: any) {
        const user = await UserModel.findByPk(userId);
        if (!user) return null;

        const updates: any = {};
        if (patch.isActive !== undefined) updates.isActive = patch.isActive;
        if (patch.isEmailVerified !== undefined)
            updates.isEmailVerified = patch.isEmailVerified;

        if (Object.keys(updates).length) {
            await user.update(updates);
        }

        return this.findById(userId);
    }

    async usernameExists(username: string, excludeUserId?: string) {
        const where: any = { username };
        if (excludeUserId) where.id = { [Op.ne]: excludeUserId };
        const count = await UserModel.count({ where });
        return count > 0;
    }
}
