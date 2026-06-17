import "dotenv/config";
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const EnvSchema = z.object({
    PORT:                   z.coerce.number().int().positive().default(8000),
    DATABASE_URL:           z.string().min(1, "DATABASE_URL is required"),
    CORS_ORIGIN:            z.string().default("http://localhost:8081"),
    NODE_ENV:               z.enum(["development", "test", "production"]).default("development"),

    // JWT — secrets must be distinct in production
    JWT_SECRET:             z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    VERIFY_EMAIL_SECRET:    isProd
                                ? z.string().min(32, "VERIFY_EMAIL_SECRET required in production")
                                : z.string().min(16).optional(),
    REFRESH_TOKEN_SECRET:   isProd
                                ? z.string().min(32, "REFRESH_TOKEN_SECRET required in production")
                                : z.string().min(16).optional(),
    RESET_PASSWORD_SECRET:  isProd
                                ? z.string().min(32, "RESET_PASSWORD_SECRET required in production")
                                : z.string().min(16).optional(),

    // OpenF1
    OPENF1_USERNAME:        z.string().optional(),
    OPENF1_PASSWORD:        z.string().optional(),

    // Sentry
    SENTRY_DSN:             z.string().url().optional(),

    // Resend (email)
    RESEND_API_KEY:         z.string().optional(),
    SMTP_FROM:              z.string().default("PoleWin <no-reply@polewin.fr>"),

    // App
    APP_URL:                z.string().default("http://localhost:3000"),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
    const errors = result.error.issues
        .map(i => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n");
    console.error("❌  Invalid environment variables:\n" + errors);
    if (process.env.NODE_ENV === "test") throw new Error("Invalid environment variables:\n" + errors);
    process.exit(1);
}

const d = result.data;

export const env = {
    port:                  d.PORT,
    databaseUrl:           d.DATABASE_URL,
    corsOrigin:            d.CORS_ORIGIN,
    nodeEnv:               d.NODE_ENV,
    jwtSecret:             d.JWT_SECRET,
    verifyEmailSecret:     d.VERIFY_EMAIL_SECRET   ?? d.JWT_SECRET,
    refreshTokenSecret:    d.REFRESH_TOKEN_SECRET  ?? d.JWT_SECRET,
    resetPasswordSecret:   d.RESET_PASSWORD_SECRET ?? d.JWT_SECRET,
    openf1Username:        d.OPENF1_USERNAME,
    openf1Password:        d.OPENF1_PASSWORD,
    sentryDsn:             d.SENTRY_DSN,
    resendApiKey:          d.RESEND_API_KEY,
    emailFrom:             d.SMTP_FROM,
    appUrl:                d.APP_URL,
};
