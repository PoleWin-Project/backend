import { z } from "zod";

export const PREDICTION_TYPES = [
    "POLE_POSITION",
    "RACE_WINNER",
    "FASTEST_LAP",
    "DNF",
    "SAFETY_CAR",
    "SPRINT_WINNER",
    "PODIUM",
] as const;

export const CreatePredictionDto = z.object({
    type:              z.enum(PREDICTION_TYPES),
    scope:             z.string().max(100).nullish(),
    closesAt:          z.iso.datetime().nullish(),
    defaultMultiplier: z.number().positive().default(2),
});

export type CreatePredictionInput = z.infer<typeof CreatePredictionDto>;

export const UpdatePredictionDto = CreatePredictionDto.omit({ defaultMultiplier: true }).partial();
export type UpdatePredictionInput = z.infer<typeof UpdatePredictionDto>;

export const PlacePronosticDto = z.object({
    value:        z.string().min(1).max(500),
    pointsStaked: z.number().int().min(1),
});

export type PlacePronosticInput = z.infer<typeof PlacePronosticDto>;

export const UpdatePronosticDto = PlacePronosticDto.partial().refine(
    (d) => d.value !== undefined || d.pointsStaked !== undefined,
    { message: "At least one field required" },
);

export type UpdatePronosticInput = z.infer<typeof UpdatePronosticDto>;

export const ResolveDto = z.object({
    winningValue: z.string().min(1).max(500).optional(),
    // Re-résolution admin : recalcule aussi les pronostics déjà "won"/"lost"
    // (corrige un résultat erroné en annulant les points déjà crédités).
    force: z.boolean().optional(),
});

export type ResolveInput = z.infer<typeof ResolveDto>;

export const ListMyPronosticsDto = z.object({
    status: z.enum(["draft", "submitted", "won", "lost", "void", "awaiting_verification"]).optional(),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export type ListMyPronosticsQuery = z.infer<typeof ListMyPronosticsDto>;
