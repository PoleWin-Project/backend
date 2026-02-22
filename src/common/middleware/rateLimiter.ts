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
