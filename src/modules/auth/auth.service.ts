import { Op, UniqueConstraintError, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import {
    UserModel,
    ProfileModel,
    PronosticModel,
    PronosticSafetyCarModel,
    PronosticWinnerDriverModel,
    PronosticWinnerTeamModel,
    LeagueMemberModel,
    ConversationModel,
    MessageModel,
} from "../../database/models";

import { hashPassword, verifyPassword } from "../../common/utils/password";
import {
    signAccessToken,
    signVerifyEmailToken,
    verifyEmailToken,
} from "../../common/utils/jwt";
import { LoginInput, RegisterInput, VerifyEmailPayload } from "./auth.dto";

export class AuthService {
    async register(input: RegisterInput) {
        try {
            const created = await sequelize.transaction(
                async (t: Transaction) => {
                    const passwordHash = await hashPassword(input.password);

                    const user = await UserModel.create(
                        {
                            email: input.email,
                            username: input.username,
                            passwordHash,
                        },
                        { transaction: t },
                    );

                    await ProfileModel.create(
                        { userId: user.id, displayName: input.username },
                        { transaction: t },
                    );

                    const verifyEmailToken = signVerifyEmailToken({
                        userId: user.id,
                        purpose: "verify_email",
                    });

                    const roles = ["user"];
                    const accessToken = signAccessToken({ id: user.id, roles });

                    return { user, roles, accessToken, verifyEmailToken };
                },
            );

            return {
                ok: true as const,
                accessToken: created.accessToken,
                verifyEmailToken: created.verifyEmailToken,
                user: {
                    id: created.user.id,
                    email: created.user.email,
                    username: created.user.username,
                    roles: created.roles,
                },
            };
        } catch (e: any) {
            if (e instanceof UniqueConstraintError) {
                return {
                    ok: false as const,
                    error: "Email or username already exists",
                };
            }
            return {
                ok: false as const,
                error: e?.message ?? "Register failed",
            };
        }
    }

    async login(input: LoginInput) {
        const user = await UserModel.findOne({
            where: {
                [Op.or]: [
                    { email: input.identifier },
                    { username: input.identifier },
                ],
            },
        });

        if (!user) return { ok: false as const, error: "Invalid credentials" };
        if (!user.passwordHash)
            return { ok: false as const, error: "Password not set" };

        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) return { ok: false as const, error: "Invalid credentials" };

        await user.update({ lastLoginAt: new Date() });

        const roles = ["user"]; // pas de table roles => rôle par défaut
        const accessToken = signAccessToken({ id: user.id, roles });

        return {
            ok: true as const,
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isEmailVerified: user.isEmailVerified,
                roles,
            },
        };
    }

    async verifyEmail(token: string) {
        if (!token) return { ok: false as const, error: "Missing token" };

        const payload = verifyEmailToken<VerifyEmailPayload>(token);
        if (!payload || payload.purpose !== "verify_email") {
            return { ok: false as const, error: "Invalid token" };
        }

        const user = await UserModel.findByPk(payload.userId);
        if (!user) return { ok: false as const, error: "User not found" };

        await user.update({ isEmailVerified: true });

        return { ok: true as const };
    }

    async resendVerifyEmail(userId: number) {
        const user = await UserModel.findByPk(userId);
        if (!user) return { ok: false as const, error: "User not found" };

        if (user.isEmailVerified) {
            return { ok: false as const, error: "Email already verified" };
        }

        // TODO: envoyer le token par email via un service d'envoi
        signVerifyEmailToken({ userId: user.id, purpose: "verify_email" });

        return { ok: true as const };
    }

    async deleteAccount(userId: number, password: string) {
        if (!password)
            return { ok: false as const, error: "Password required" };

        return sequelize.transaction(async (t) => {
            const user = await UserModel.findByPk(userId, { transaction: t });
            if (!user) return { ok: false as const, error: "User not found" };
            if (!user.passwordHash)
                return { ok: false as const, error: "Password not set" };

            const valid = await verifyPassword(password, user.passwordHash);
            if (!valid)
                return { ok: false as const, error: "Invalid password" };

            // Supprime les sous-tables des pronostics avant les pronostics
            const pronostics = await PronosticModel.findAll({
                where: { userId },
                attributes: ["id"],
                transaction: t,
            });
            const pronosticIds = pronostics.map((p) => p.id);

            if (pronosticIds.length > 0) {
                await PronosticSafetyCarModel.destroy({
                    where: { pronosticId: pronosticIds },
                    transaction: t,
                });
                await PronosticWinnerDriverModel.destroy({
                    where: { pronosticId: pronosticIds },
                    transaction: t,
                });
                await PronosticWinnerTeamModel.destroy({
                    where: { pronosticId: pronosticIds },
                    transaction: t,
                });
                await PronosticModel.destroy({
                    where: { userId },
                    transaction: t,
                });
            }

            // Supprime les memberships de ligues
            await LeagueMemberModel.destroy({
                where: { userId },
                transaction: t,
            });

            // Supprime les conversations et leurs messages
            const conversations = await ConversationModel.findAll({
                where: {
                    [Op.or]: [{ user1Id: userId }, { user2Id: userId }],
                },
                attributes: ["id"],
                transaction: t,
            });
            const conversationIds = conversations.map((c) => c.id);

            if (conversationIds.length > 0) {
                await MessageModel.destroy({
                    where: { conversationId: conversationIds },
                    transaction: t,
                });
                await ConversationModel.destroy({
                    where: { id: conversationIds },
                    transaction: t,
                });
            }

            // Supprime le profil et l'utilisateur
            await ProfileModel.destroy({
                where: { userId: user.id },
                transaction: t,
            });
            await user.destroy({ transaction: t });

            return { ok: true as const };
        });
    }
}
