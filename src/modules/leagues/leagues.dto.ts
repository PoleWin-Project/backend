import { z } from "zod";

const LeagueName = z.string()
    .trim()
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(32, "Le nom ne peut pas dépasser 32 caractères")
    .regex(/^[\p{L}\p{N} .'-]+$/u, "Le nom contient des caractères non autorisés");

export const CreateLeagueDto = z.object({
    name: LeagueName,
    scoringMode: z.enum(["season", "from_join"]).default("season"),
});

export const UpdateLeagueDto = z.object({
    name: LeagueName,
});

export const JoinLeagueDto = z.object({
    inviteCode: z.string()
        .trim()
        .min(6)
        .max(16)
        .transform(value => value.replace(/[\s-]/g, "").toUpperCase()),
});

export type CreateLeagueInput = z.infer<typeof CreateLeagueDto>;
export type UpdateLeagueInput = z.infer<typeof UpdateLeagueDto>;
export type JoinLeagueInput = z.infer<typeof JoinLeagueDto>;
export type LeagueScoringMode = "season" | "from_join";
