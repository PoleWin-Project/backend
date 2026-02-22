import { z } from "zod";

const strongPassword = z
    .string()
    .min(8, "Au moins 8 caractères requis")
    .max(200)
    .regex(/[A-Z]/, "Au moins une lettre majuscule requise")
    .regex(/[a-z]/, "Au moins une lettre minuscule requise")
    .regex(/[0-9]/, "Au moins un chiffre requis")
    .regex(/[^A-Za-z0-9]/, "Au moins un caractère spécial requis (!@#$%^&*…)");

export const RegisterDto = z
    .object({
        email:           z.string().email().max(255),
        username:        z.string().min(3).max(50),
        password:        strongPassword,
        confirmPassword: z.string(),
        dateOfBirth:     z.string().date().optional(),
        country:         z.string().max(100).optional(),
        language:        z.string().max(20).optional(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmPassword"],
    });

export const LoginDto = z.object({
    identifier: z.string().min(3).max(255),
    password:   z.string().min(1).max(200),
});

export const VerifyEmailQueryDto = z.object({
    token: z.string().min(10),
});

export const DeleteAccountDto = z.object({
    password: z.string().min(1).max(200),
});

export const ChangePasswordDto = z
    .object({
        currentPassword:    z.string().min(1).max(200),
        newPassword:        strongPassword,
        confirmNewPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmNewPassword, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmNewPassword"],
    });

export const ForgotPasswordDto = z.object({
    email: z.string().email().max(255),
});

export const ResetPasswordDto = z
    .object({
        token:              z.string().min(10),
        newPassword:        strongPassword,
        confirmNewPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmNewPassword, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmNewPassword"],
    });

export const RefreshTokenDto = z.object({
    refreshToken: z.string().min(10),
});

export type RegisterInput       = z.infer<typeof RegisterDto>;
export type LoginInput          = z.infer<typeof LoginDto>;
export type DeleteAccountInput  = z.infer<typeof DeleteAccountDto>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordDto>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordDto>;
export type ResetPasswordInput  = z.infer<typeof ResetPasswordDto>;
export type RefreshTokenInput   = z.infer<typeof RefreshTokenDto>;

export type VerifyEmailPayload = {
    userId:  number;
    purpose: "verify_email";
};

export type PasswordResetPayload = {
    userId:  number;
    purpose: "reset_password";
};
