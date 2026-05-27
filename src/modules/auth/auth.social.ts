import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { UserModel, ProfileModel } from "../../database/models";
import { hashPassword } from "../../common/utils/password";
import { signAccessToken, signRefreshToken } from "../../common/utils/jwt";
import { AuthUser } from "../../common/security/auth.types";
import { sequelize } from "../../database/sequelize";

const googleClient = new OAuth2Client();

function generateRandomUsername(email: string) {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    return `${base}${Math.floor(Math.random() * 10000)}`;
}

export async function processSocialLogin(
    provider: 'google' | 'apple',
    providerId: string,
    email: string,
    displayName?: string
) {
    let user = await UserModel.findOne({ where: { email } });

    if (!user) {
        const username = displayName?.replace(/[^a-zA-Z0-9]/g, '') || generateRandomUsername(email);
        
        user = await sequelize.transaction(async (t) => {
            const randomPassword = Math.random().toString(36).slice(-10) + "A1!";
            const passwordHash = await hashPassword(randomPassword);

            const newUser = await UserModel.create({
                email,
                username,
                passwordHash,
                isEmailVerified: true,
                googleId: provider === 'google' ? providerId : null,
                appleId: provider === 'apple' ? providerId : null,
            }, { transaction: t });

            await ProfileModel.create(
                { userId: newUser.id, displayName: username },
                { transaction: t }
            );

            return newUser;
        });
    } else {
        // Mettre à jour l'ID social s'il manquait
        if (provider === 'google' && !user.googleId) {
            await user.update({ googleId: providerId });
        } else if (provider === 'apple' && !user.appleId) {
            await user.update({ appleId: providerId });
        }
    }

    await user.update({ lastLoginAt: new Date() });
    
    // Charger le profil pour les points
    await user.reload({ include: [{ model: ProfileModel, as: "profile" }] });

    const roles = [user.role ?? "user"];
    const authUser: AuthUser = { id: user.id, roles };
    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken(authUser);

    return {
        ok: true as const,
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isEmailVerified: user.isEmailVerified,
            roles,
            points: user.profile?.points ?? 0,
            profile: {
                favoriteTeamCode: user.profile?.favoriteTeamCode ?? null,
                favoriteDriverCode: user.profile?.favoriteDriverCode ?? null,
            }
        },
    };
}

export async function verifyGoogleToken(idToken: string) {
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: [
                process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '',
                process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '',
                process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '',
            ].filter(Boolean),
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) return { ok: false as const, error: "Email missing from Google token" };
        
        return processSocialLogin('google', payload.sub, payload.email, payload.name);
    } catch (e: any) {
        return { ok: false as const, error: e.message || "Invalid Google token" };
    }
}

export async function verifyAppleToken(identityToken: string, emailFromClient?: string, fullName?: { givenName?: string|null, familyName?: string|null }) {
    try {
        const decoded = await appleSignin.verifyIdToken(identityToken, {
            // Options supplémentaires pour Apple
            ignoreExpiration: false,
        });
        
        const email = decoded.email || emailFromClient;
        if (!email) return { ok: false as const, error: "Email missing from Apple auth" };

        let displayName = undefined;
        if (fullName?.givenName || fullName?.familyName) {
            displayName = `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim();
        }

        return processSocialLogin('apple', decoded.sub, email, displayName);
    } catch (e: any) {
        return { ok: false as const, error: e.message || "Invalid Apple token" };
    }
}
