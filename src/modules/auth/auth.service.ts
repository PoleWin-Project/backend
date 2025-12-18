import { Op, Transaction, UniqueConstraintError } from "sequelize";
import { sequelize } from "../../database/sequelize";
import {
    UserModel,
    UserProfileModel,
    RoleModel,
    UserRoleModel,
} from "../../database/models";

import { hashPassword, verifyPassword } from "../../common/utils/password";
import {
    signAccessToken,
    signVerifyEmailToken,
    verifyToken,
} from "../../common/utils/jwt";
import { LoginInput, RegisterInput, VerifyEmailPayload } from "./auth.dto";

async function getUserRoles(
    userId: string,
    t?: Transaction
): Promise<string[]> {
    const user = await UserModel.findByPk(userId, {
        include: [
            {
                model: RoleModel,
                as: "roles",
                attributes: ["name"],
                through: { attributes: [] },
            },
        ],
        transaction: t,
    });

    const roles = (user as any)?.roles as Array<{ name: string }> | undefined;
    return roles?.map((r) => r.name) ?? [];
}

export class AuthService {
    async register(input: RegisterInput) {
        try {
            const created = await sequelize.transaction(async (t) => {
                const passwordHash = await hashPassword(input.password);

                const user = await UserModel.create(
                    {
                        email: input.email,
                        username: input.username,
                        passwordHash,
                        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
                        country: input.country ?? null,
                        language: input.language ?? null,
                        isEmailVerified: false,
                        isActive: true,
                    },
                    { transaction: t }
                );

                await UserProfileModel.create(
                    { userId: user.id, displayName: input.username },
                    { transaction: t }
                );

                const [role] = await RoleModel.findOrCreate({
                    where: { name: "user" },
                    defaults: {
                        name: "user",
                        description: "Default user role",
                    },
                    transaction: t,
                });

                await UserRoleModel.findOrCreate({
                    where: { userId: user.id, roleId: role.id },
                    defaults: { userId: user.id, roleId: role.id },
                    transaction: t,
                });

                const roles = await getUserRoles(user.id, t);
                const accessToken = signAccessToken({ id: user.id, roles });

                const verifyEmailToken = signVerifyEmailToken({
                    userId: user.id,
                    purpose: "verify_email",
                });

                return { user, roles, accessToken, verifyEmailToken };
            });

            return {
                ok: true as const,
                accessToken: created.accessToken,
                verifyEmailToken: created.verifyEmailToken,
                user: {
                    id: created.user.id,
                    email: created.user.email,
                    username: created.user.username,
                    isEmailVerified: created.user.isEmailVerified,
                    isActive: created.user.isActive,
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
        if (!user.isActive)
            return { ok: false as const, error: "Account disabled" };
        if (!user.passwordHash)
            return { ok: false as const, error: "Password not set" };

        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) return { ok: false as const, error: "Invalid credentials" };

        await user.update({ lastLoginAt: new Date() });

        const roles = await getUserRoles(user.id);
        const accessToken = signAccessToken({ id: user.id, roles });

        return {
            ok: true as const,
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isEmailVerified: user.isEmailVerified,
                isActive: user.isActive,
                roles,
            },
        };
    }

    async verifyEmail(token: string) {
        if (!token) return { ok: false as const, error: "Missing token" };

        const payload = verifyToken<VerifyEmailPayload>(token);
        if (!payload || payload.purpose !== "verify_email") {
            return { ok: false as const, error: "Invalid token" };
        }

        const user = await UserModel.findByPk(payload.userId);
        if (!user) return { ok: false as const, error: "User not found" };

        if (user.isEmailVerified) return { ok: true as const };

        await user.update({ isEmailVerified: true });
        return { ok: true as const };
    }

    async resendVerifyEmail(userId: string) {
        const user = await UserModel.findByPk(userId);
        if (!user) return { ok: false as const, error: "User not found" };
        if (user.isEmailVerified)
            return { ok: false as const, error: "Email already verified" };

        const verifyEmailToken = signVerifyEmailToken({
            userId: user.id,
            purpose: "verify_email",
        });
        return { ok: true as const, verifyEmailToken };
    }

    async deleteAccount(userId: string, password: string) {
        if (!password)
            return { ok: false as const, error: "Password required" };

        const user = await UserModel.findByPk(userId);
        if (!user) return { ok: false as const, error: "User not found" };
        if (!user.passwordHash)
            return { ok: false as const, error: "Password not set" };

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return { ok: false as const, error: "Invalid password" };

        await user.destroy(); 
        return { ok: true as const };
    }
}