import { Op, UniqueConstraintError, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import {
    UserModel,
    ProfileModel,
} from "../../database/models";

import { hashPassword, verifyPassword } from "../../common/utils/password";
import {
    signAccessToken,
    signRefreshToken,
    signVerifyEmailToken,
    signPasswordResetToken,
    verifyEmailToken,
    verifyRefreshToken,
    verifyPasswordResetToken,
} from "../../common/utils/jwt";
import {
    LoginInput,
    RegisterInput,
    VerifyEmailPayload,
    PasswordResetPayload,
} from "./auth.dto";
import { AuthUser } from "../../common/security/auth.types";

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

                    const roles = [user.role ?? "user"];
                    const authUser: AuthUser = { id: user.id, roles };
                    const accessToken  = signAccessToken(authUser);
                    const refreshToken = signRefreshToken(authUser);

                    return { user, roles, accessToken, refreshToken, verifyEmailToken };
                },
            );

            return {
                ok: true as const,
                accessToken:      created.accessToken,
                refreshToken:     created.refreshToken,
                verifyEmailToken: created.verifyEmailToken,
                user: {
                    id:       created.user.id,
                    email:    created.user.email,
                    username: created.user.username,
                    roles:    created.roles,
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

        const roles = [user.role ?? "user"];
        const authUser: AuthUser = { id: user.id, roles };
        const accessToken  = signAccessToken(authUser);
        const refreshToken = signRefreshToken(authUser);

        return {
            ok: true as const,
            accessToken,
            refreshToken,
            user: {
                id:              user.id,
                email:           user.email,
                username:        user.username,
                isEmailVerified: user.isEmailVerified,
                roles,
            },
        };
    }

    async refresh(refreshToken: string) {
        const payload = verifyRefreshToken<AuthUser & { iat?: number; exp?: number }>(refreshToken);
        if (!payload) return { ok: false as const, error: "Invalid or expired refresh token" };

        const user = await UserModel.findByPk(payload.id);
        if (!user) {
            return { ok: false as const, error: "User not found" };
        }

        const roles = [user.role ?? "user"];
        const authUser: AuthUser = { id: user.id, roles };
        const newAccessToken  = signAccessToken(authUser);
        const newRefreshToken = signRefreshToken(authUser);

        return {
            ok: true as const,
            accessToken:  newAccessToken,
            refreshToken: newRefreshToken,
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

        const token = signVerifyEmailToken({ userId: user.id, purpose: "verify_email" });
        void token;

        return { ok: true as const };
    }

    async changePassword(userId: number, currentPassword: string, newPassword: string) {
        const user = await UserModel.findByPk(userId);
        if (!user) return { ok: false as const, error: "User not found" };
        if (!user.passwordHash) return { ok: false as const, error: "Password not set" };

        const valid = await verifyPassword(currentPassword, user.passwordHash);
        if (!valid) return { ok: false as const, error: "Current password is incorrect" };

        const newHash = await hashPassword(newPassword);
        await user.update({ passwordHash: newHash });

        return { ok: true as const };
    }

    async forgotPassword(email: string) {
        const user = await UserModel.findOne({ where: { email } });

        if (!user) return { ok: true as const };

        const resetToken = signPasswordResetToken({
            userId:  user.id,
            purpose: "reset_password",
        });

        void resetToken;

        return { ok: true as const };
    }

    async resetPassword(token: string, newPassword: string) {
        const payload = verifyPasswordResetToken<PasswordResetPayload>(token);
        if (!payload || payload.purpose !== "reset_password") {
            return { ok: false as const, error: "Invalid or expired token" };
        }

        const user = await UserModel.findByPk(payload.userId);
        if (!user) return { ok: false as const, error: "User not found" };

        const newHash = await hashPassword(newPassword);
        await user.update({ passwordHash: newHash });

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

            await user.destroy({ transaction: t });

            return { ok: true as const };
        });
    }
}
