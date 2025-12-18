import { z } from "zod";

export const RegisterDto = z.object({
    email: z.string().email().max(255),
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(200),
    dateOfBirth: z.string().date().optional(), 
    country: z.string().max(100).optional(),
    language: z.string().max(20).optional(),
});

export const LoginDto = z.object({
    identifier: z.string().min(3).max(255), 
    password: z.string().min(1).max(200),
});

export const VerifyEmailQueryDto = z.object({
    token: z.string().min(10),
});

export const DeleteAccountDto = z.object({
    password: z.string().min(1).max(200),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountDto>;

export type VerifyEmailPayload = {
    userId: string;
    purpose: "verify_email";
};