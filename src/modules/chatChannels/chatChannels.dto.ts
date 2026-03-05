import { z } from "zod";

export const ListChatChannelsQueryDto = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export type ListChatChannelsQuery = z.infer<typeof ListChatChannelsQueryDto>;
export type CreateChatChannelInput = { name: string };
