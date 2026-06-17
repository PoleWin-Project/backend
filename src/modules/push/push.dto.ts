import { z } from "zod";

export const RegisterPushTokenDto = z.object({
    token: z.string().min(1),
    platform: z.enum(["ios", "android", "web"]).optional(),
});
export type RegisterPushTokenInput = z.infer<typeof RegisterPushTokenDto>;

export const RemovePushTokenDto = z.object({
    token: z.string().min(1),
});
export type RemovePushTokenInput = z.infer<typeof RemovePushTokenDto>;
