import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

const skipInTest = () => env.nodeEnv === "test";

const rateLimitMsg = (code: string) => ({
    status: "error",
    code,
    message: "Too many requests, please try again later",
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: rateLimitMsg("TOO_MANY_AUTH_REQUESTS"),
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: rateLimitMsg("TOO_MANY_REQUESTS"),
});

// Chat messages: 20 messages / minute
export const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: rateLimitMsg("TOO_MANY_CHAT_MESSAGES"),
});

// Pronostics: 30 bets / 15 minutes
export const pronosticLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: rateLimitMsg("TOO_MANY_PRONOSTIC_REQUESTS"),
});
