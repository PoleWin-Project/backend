import { z } from "zod";

export const LeaderboardQueryDto = z.object({
    limit:  z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().optional(),
});

export type LeaderboardQuery = z.infer<typeof LeaderboardQueryDto>;
