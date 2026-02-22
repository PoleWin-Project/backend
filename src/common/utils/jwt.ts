import jwt from "jsonwebtoken";
import { AuthUser } from "../security/auth.types";
import { env } from "../../config/env";

export function signAccessToken(payload: AuthUser) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
}

export function verifyAccessToken<T>(token: string): T | null {
    try {
        return jwt.verify(token, env.jwtSecret) as T;
    } catch {
        return null;
    }
}

export function signRefreshToken(payload: AuthUser) {
    return jwt.sign(payload, env.refreshTokenSecret, { expiresIn: "7d" });
}

export function verifyRefreshToken<T>(token: string): T | null {
    try {
        return jwt.verify(token, env.refreshTokenSecret) as T;
    } catch {
        return null;
    }
}

export function signVerifyEmailToken(payload: object) {
    return jwt.sign(payload, env.verifyEmailSecret, { expiresIn: "24h" });
}

export function verifyEmailToken<T>(token: string): T | null {
    try {
        return jwt.verify(token, env.verifyEmailSecret) as T;
    } catch {
        return null;
    }
}

export function signPasswordResetToken(payload: object) {
    return jwt.sign(payload, env.resetPasswordSecret, { expiresIn: "1h" });
}

export function verifyPasswordResetToken<T>(token: string): T | null {
    try {
        return jwt.verify(token, env.resetPasswordSecret) as T;
    } catch {
        return null;
    }
}
