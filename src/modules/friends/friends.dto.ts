import { z } from "zod";

export const SendFriendRequestDto = z.object({
    receiverId: z.number().int().positive(),
});

export const RespondFriendRequestDto = z.object({
    action: z.enum(["accept", "decline"]),
});

export type SendFriendRequestInput   = z.infer<typeof SendFriendRequestDto>;
export type RespondFriendRequestInput = z.infer<typeof RespondFriendRequestDto>;
