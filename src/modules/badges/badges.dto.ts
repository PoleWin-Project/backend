import { z } from "zod";

export const CreateBadgeDto = z.object({
    name:        z.string().min(1).max(100),
    code:        z.string().min(1).max(50).optional(),
    description: z.string().max(1000).nullish(),
    imageUrl:    z.string().url().max(500).nullish(),
    rarity:      z.enum(["common", "uncommon", "rare", "epic", "legendary"]).nullish(),
});

export type CreateBadgeInput = z.infer<typeof CreateBadgeDto>;

export const UpdateBadgeDto = CreateBadgeDto.partial();
export type UpdateBadgeInput = z.infer<typeof UpdateBadgeDto>;

export const AwardBadgeDto = z.object({
    badgeId: z.number().int().positive(),
});

export type AwardBadgeInput = z.infer<typeof AwardBadgeDto>;
