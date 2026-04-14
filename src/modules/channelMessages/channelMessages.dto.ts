import { z } from "zod";

export const ListChannelMessagesQueryDto = z.object({
    limit:  z.coerce.number().int().min(1).max(100).default(30),
    offset: z.coerce.number().int().min(0).default(0),
    // cursor-based: load messages older than this id (for infinite scroll up)
    before: z.coerce.number().int().positive().optional(),
    // polling: load messages newer than this id
    after:  z.coerce.number().int().positive().optional(),
});

export const CreateChannelMessageDto = z.object({
    content: z.string().min(1).max(5000),
});

export type ListChannelMessagesQuery = z.infer<typeof ListChannelMessagesQueryDto>;
export type CreateChannelMessageInput = z.infer<typeof CreateChannelMessageDto>;
