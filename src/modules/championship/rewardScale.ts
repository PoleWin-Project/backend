/**
 * Barème des récompenses de pronostic — modèle « championship » (sans mise).
 *
 * ⚠️ Ce n'est PAS une cote : le joueur n'engage rien. Le barème indique seulement
 * combien de POINTS DE CHAMPIONNAT un pronostic CORRECT rapporte. Un pronostic
 * incorrect rapporte 0 et ne retire jamais rien.
 *
 * Principe : un choix « difficile » rapporte plus qu'un choix « évident ». La
 * difficulté d'un pilote est estimée par sa position au classement du championnat
 * pilotes au moment où le barème de la prédiction est généré.
 *
 * ⚠️ VALEURS PROVISOIRES (décision D1 du plan de migration, à valider). Toute
 * modification des valeurs DOIT s'accompagner d'un changement de REWARD_RULE_VERSION :
 * les barèmes déjà générés et les récompenses déjà snapshotées ne sont jamais
 * recalculés.
 *
 * Module volontairement PUR (aucun accès réseau / base) pour être testable.
 */

export const REWARD_RULE_VERSION = "v1-standings";

/** Types de prédiction dont la réponse est l'acronyme d'un pilote. */
export const DRIVER_PREDICTION_TYPES = [
    "POLE_POSITION",
    "RACE_WINNER",
    "SPRINT_WINNER",
    "FASTEST_LAP",
    "DNF",
] as const;

/** Option « par défaut » : s'applique à toute valeur sans option dédiée. */
export const DEFAULT_OPTION = "*";

/** Bornes de sécurité (aussi garanties par un CHECK en base : 1..1000). */
export const MIN_REWARD = 50;
export const MAX_REWARD = 300;

/** Paliers selon la position au championnat pilotes (position ≤ maxPosition). */
const STANDING_TIERS: { maxPosition: number; points: number }[] = [
    { maxPosition: 3,        points: 100 },
    { maxPosition: 6,        points: 150 },
    { maxPosition: 10,       points: 200 },
    { maxPosition: 15,       points: 250 },
    { maxPosition: Infinity, points: 300 },
];

/**
 * Coefficient par type : le sprint est un format plus court, il rapporte un peu moins.
 * Les autres types pilotes utilisent le barème plein.
 */
const TYPE_COEFFICIENT: Record<string, number> = {
    POLE_POSITION: 1,
    RACE_WINNER:   1,
    FASTEST_LAP:   1,
    SPRINT_WINNER: 0.75,
};

/** Récompenses fixes des types qui ne dépendent pas du classement pilotes. */
export const FIXED_REWARDS = {
    // Un abandon donné est rare mais plusieurs pilotes peuvent abandonner :
    // valeur unique pour tous les pilotes.
    DNF: 150,
    SAFETY_CAR: { YES: 100, NO: 100 },
    // PODIUM : ordre exact = récompense pleine ; 3 bons pilotes dans le désordre = partielle.
    PODIUM: { exact: 300, partial: 150 },
    // Repli quand le classement pilotes est indisponible (API externe en panne…) :
    // même valeur pour tous les pilotes, plutôt que de bloquer les pronostics.
    FALLBACK_DRIVER: 150,
} as const;

/** Arrondi au multiple de 5 le plus proche + bornage [MIN_REWARD, MAX_REWARD]. */
function normalize(points: number): number {
    const rounded = Math.round(points / 5) * 5;
    return Math.min(MAX_REWARD, Math.max(MIN_REWARD, rounded));
}

/** Récompense d'un pilote selon sa position au championnat (null = inconnue). */
export function rewardForStanding(type: string, standingPosition: number | null): number {
    const coefficient = TYPE_COEFFICIENT[type] ?? 1;
    // Pilote absent du classement (rookie, remplaçant) → palier le plus élevé.
    const position = standingPosition ?? Infinity;
    const tier = STANDING_TIERS.find((t) => position <= t.maxPosition)!;
    return normalize(tier.points * coefficient);
}

export interface RewardOptionDraft {
    optionValue: string;
    rewardPoints: number;
    partialRewardPoints: number | null;
    computedFrom: Record<string, unknown>;
}

export interface DriverStandingInput {
    acronym: string;
    position: number;
}

/**
 * Construit la liste des options de récompense d'une prédiction.
 * `standings` vide ⇒ barème de repli uniforme (FALLBACK_DRIVER).
 */
export function buildRewardOptions(type: string, standings: DriverStandingInput[]): RewardOptionDraft[] {
    if (type === "PODIUM") {
        return [{
            optionValue: DEFAULT_OPTION,
            rewardPoints: FIXED_REWARDS.PODIUM.exact,
            partialRewardPoints: FIXED_REWARDS.PODIUM.partial,
            computedFrom: { rule: "fixed" },
        }];
    }

    if (type === "SAFETY_CAR") {
        return Object.entries(FIXED_REWARDS.SAFETY_CAR).map(([value, points]) => ({
            optionValue: value,
            rewardPoints: points,
            partialRewardPoints: null,
            computedFrom: { rule: "fixed" },
        }));
    }

    if (type === "DNF") {
        return [{
            optionValue: DEFAULT_OPTION,
            rewardPoints: FIXED_REWARDS.DNF,
            partialRewardPoints: null,
            computedFrom: { rule: "fixed" },
        }];
    }

    if (!standings.length) {
        return [{
            optionValue: DEFAULT_OPTION,
            rewardPoints: normalize(FIXED_REWARDS.FALLBACK_DRIVER * (TYPE_COEFFICIENT[type] ?? 1)),
            partialRewardPoints: null,
            computedFrom: { rule: "fallback", reason: "standings_unavailable" },
        }];
    }

    const seen = new Set<string>();
    const options: RewardOptionDraft[] = [];
    for (const s of standings) {
        const acronym = s.acronym?.trim().toUpperCase();
        if (!acronym || seen.has(acronym)) continue;
        seen.add(acronym);
        options.push({
            optionValue: acronym,
            rewardPoints: rewardForStanding(type, s.position),
            partialRewardPoints: null,
            computedFrom: { rule: "standings", standingPosition: s.position },
        });
    }
    // Pilote absent du classement (remplaçant…) → palier le plus élevé.
    options.push({
        optionValue: DEFAULT_OPTION,
        rewardPoints: rewardForStanding(type, null),
        partialRewardPoints: null,
        computedFrom: { rule: "standings", standingPosition: null },
    });
    return options;
}

// ── Validation des valeurs de pronostic ──────────────────────────────────────

const ACRONYM = /^[A-Z]{3}$/;

/**
 * Normalise et valide la valeur envoyée par le client selon le type de prédiction.
 * Retourne null si la valeur est invalide.
 */
export function normalizePronosticValue(type: string, raw: string): string | null {
    const value = raw.trim().toUpperCase();
    if (type === "SAFETY_CAR") return value === "YES" || value === "NO" ? value : null;
    if (type === "PODIUM") {
        const drivers = value.split(",").map((d) => d.trim());
        const valid = drivers.length === 3
            && drivers.every((d) => ACRONYM.test(d))
            && new Set(drivers).size === 3;
        return valid ? drivers.join(",") : null;
    }
    if ((DRIVER_PREDICTION_TYPES as readonly string[]).includes(type)) {
        return ACRONYM.test(value) ? value : null;
    }
    return null;
}

export interface RewardOptionLike {
    optionValue: string;
    rewardPoints: number;
    partialRewardPoints: number | null;
}

/** Trouve la récompense applicable à une valeur (option dédiée, sinon option par défaut). */
export function pickReward(
    type: string,
    value: string,
    options: RewardOptionLike[],
): { rewardPoints: number; partialRewardPoints: number | null } | null {
    const lookupKey = type === "PODIUM" ? DEFAULT_OPTION : value;
    const option = options.find((o) => o.optionValue === lookupKey)
        ?? options.find((o) => o.optionValue === DEFAULT_OPTION);
    if (!option) return null;
    return { rewardPoints: option.rewardPoints, partialRewardPoints: option.partialRewardPoints };
}

/**
 * Points de championnat attribués à un pronostic résolu.
 * - incorrect → 0 (jamais négatif : aucune perte possible)
 * - PODIUM : ordre exact → snapshot plein ; 3 bons pilotes → snapshot partiel.
 */
export function computeAwardedPoints(
    type: string,
    userValue: string,
    winningValue: string,
    snapshot: { rewardPoints: number; partialRewardPoints: number | null },
    isWinner: (userValue: string, winningValue: string) => boolean,
): { correct: boolean; points: number } {
    if (type === "PODIUM") {
        const user = userValue.split(",");
        const win = winningValue.split(",");
        if (userValue === winningValue) return { correct: true, points: snapshot.rewardPoints };
        const sameDrivers = user.length === 3 && win.length === 3 && win.every((d) => user.includes(d));
        if (sameDrivers) return { correct: true, points: snapshot.partialRewardPoints ?? 0 };
        return { correct: false, points: 0 };
    }
    const correct = isWinner(userValue, winningValue);
    return { correct, points: correct ? snapshot.rewardPoints : 0 };
}
