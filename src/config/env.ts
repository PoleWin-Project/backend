import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
    PORT:                   z.coerce.number().int().positive().default(8000),
    DATABASE_URL:           z.string().min(1, "DATABASE_URL is required"),
    CORS_ORIGIN:            z.string().default("http://localhost:3000"),
    NODE_ENV:               z.enum(["development", "test", "production"]).default("development"),
    JWT_SECRET:             z.string().min(16, "JWT_SECRET must be at least 16 characters"),
    VERIFY_EMAIL_SECRET:    z.string().min(16).optional(),
    REFRESH_TOKEN_SECRET:   z.string().min(16).optional(),
    RESET_PASSWORD_SECRET:  z.string().min(16).optional(),
    OPENF1_USERNAME:        z.string().optional(),
    OPENF1_PASSWORD:        z.string().optional(),
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

export const env = {
    port:                  result.data.PORT,
    databaseUrl:           result.data.DATABASE_URL,
    corsOrigin:            result.data.CORS_ORIGIN,
    nodeEnv:               result.data.NODE_ENV,
    jwtSecret:             result.data.JWT_SECRET,
    verifyEmailSecret:     result.data.VERIFY_EMAIL_SECRET    ?? result.data.JWT_SECRET,
    refreshTokenSecret:    result.data.REFRESH_TOKEN_SECRET   ?? result.data.JWT_SECRET,
    resetPasswordSecret:   result.data.RESET_PASSWORD_SECRET  ?? result.data.JWT_SECRET,
    openf1Username:        result.data.OPENF1_USERNAME,
    openf1Password:        result.data.OPENF1_PASSWORD,
};
