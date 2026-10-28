import { z } from "zod";

export const CreateLeagueDto = z.object({
    name: z.string().trim().min(2).max(100),
    seasonYear: z.number().int().min(2023).max(2100).optional(),
});

export const JoinLeagueDto = z.object({
    inviteCode: z.string().trim().min(8).max(64),
});
