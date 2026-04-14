import { z } from "zod";

export const SendDmDto = z.object({
    content: z.string().min(1).max(2000),
});

export const ListDmsQueryDto = z.object({
    limit:  z.coerce.number().int().min(1).max(100).default(40),
    before: z.coerce.number().int().positive().optional(),
});

export type SendDmInput    = z.infer<typeof SendDmDto>;
export type ListDmsQuery   = z.infer<typeof ListDmsQueryDto>;
