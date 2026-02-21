import jwt from "jsonwebtoken";
import { AuthUser } from "../security/auth.types";
import { env } from "../../config/env";

export function signAccessToken(payload: AuthUser) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
}

export function signVerifyEmailToken(payload: object) {
    return jwt.sign(payload, env.verifyEmailSecret, { expiresIn: "24h" });
}

export function verifyAccessToken<T>(token: string): T | null {
    try {
        return jwt.verify(token, env.jwtSecret) as T;
    } catch {
        return null;
    }
}

export function verifyEmailToken<T>(token: string): T | null {
    try {
        return jwt.verify(token, env.verifyEmailSecret) as T;
    } catch {
        return null;
    }
}
