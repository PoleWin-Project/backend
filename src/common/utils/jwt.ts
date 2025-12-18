import jwt from "jsonwebtoken";
import { AuthUser } from "../security/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const VERIFY_EMAIL_SECRET = process.env.VERIFY_EMAIL_SECRET || JWT_SECRET;

export function signAccessToken(payload: AuthUser) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signVerifyEmailToken(payload: any) {
    return jwt.sign(payload, VERIFY_EMAIL_SECRET, { expiresIn: "24h" });
}

export function verifyToken<T>(token: string): T | null {
    try {
        return jwt.verify(token, JWT_SECRET) as T;
    } catch {
        try {
            return jwt.verify(token, VERIFY_EMAIL_SECRET) as T;
        } catch {
            return null;
        }
    }
}