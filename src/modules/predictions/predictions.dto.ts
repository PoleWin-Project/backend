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
    // DÉPRÉCIÉ (modèle legacy) : n'a jamais été persisté (pas de colonne), le
    // multiplicateur effectif était toujours ×2. Conservé pour ne pas casser les
    // appels admin existants ; ignoré par le modèle championship.
    defaultMultiplier: z.number().positive().default(2),
});

export type CreatePredictionInput = z.infer<typeof CreatePredictionDto>;

export const UpdatePredictionDto = CreatePredictionDto.omit({ defaultMultiplier: true }).partial();
export type UpdatePredictionInput = z.infer<typeof UpdatePredictionDto>;

/**
 * Validation d'un pronostic.
 *  - mode championship : seul `value` compte. AUCUN montant n'est accepté du client ;
 *    la récompense est calculée et snapshotée par le serveur.
 *  - mode legacy : `pointsStaked` reste obligatoire (contrôlé dans le service).
 * `pointsStaked` est donc optionnel ici, puis DÉPRÉCIÉ : un ancien client qui l'envoie
 * en mode championship voit sa mise ignorée (ou reçoit 426 selon LEGACY_CLIENT_POLICY).
 */
export const PlacePronosticDto = z.object({
    value:        z.string().min(1).max(500),
    pointsStaked: z.number().int().min(1).optional(),
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
    // MODE LEGACY UNIQUEMENT : en mode championship les points ne sont jamais retirés
    // par une re-résolution (une correction d'arbitrage devra passer par un
    // événement `admin_correction` tracé — à implémenter).
    force: z.boolean().optional(),
});

export type ResolveInput = z.infer<typeof ResolveDto>;

export const ListMyPronosticsDto = z.object({
    status: z.enum(["draft", "submitted", "won", "lost", "void", "awaiting_verification"]).optional(),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export type ListMyPronosticsQuery = z.infer<typeof ListMyPronosticsDto>;
