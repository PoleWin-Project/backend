import { httpErrors } from "../../common/errors/http";
import { AppError } from "../../common/errors/AppError";
import { logger } from "../../config/logger";
import { OpenF1Service } from "../openf1/openf1.service";
import { GamesService } from "../games/games.service";

// ── Types ───────────────────────────────────────────────────────────────────

/** Pilote enrichi utilisé pour la comparaison quotidienne. */
export interface DriverDleDriver {
    driverId:             string;        // stable dans la saison — dérivé du numéro de course
    fullName:             string;
    teamName:             string;
    nationality:          string;
    driverNumber:         number;
    debutYear:            number;       // année de début en F1
    headshotUrl:          string | null;
    wins:                 number;
    podiums:              number;
}

/** Entrée du roster exposée au frontend (ne révèle pas le pilote du jour). */
export interface RosterEntry {
    driverId:     string;
    fullName:     string;
    teamName:     string;
    driverNumber: number;
    nationality:  string;
    headshotUrl:  string | null;
}

export type CategoricalStatus = "exact" | "wrong";
export type NumericStatus     = "exact" | "higher" | "lower";

export interface CategoricalFeedback {
    value:  string;
    status: CategoricalStatus;
}

export interface NumericFeedback {
    value:  number;
    status: NumericStatus;
}

export interface GuessFeedback {
    driverId:             string;
    fullName:             string;
    headshotUrl:          string | null;
    team:                 CategoricalFeedback;
    nationality:          CategoricalFeedback;
    debutYear:            NumericFeedback;
    wins:                 NumericFeedback;
    podiums:              NumericFeedback;
}

export interface GuessResult {
    found:        boolean;
    gameOver:     boolean;
    attemptsUsed: number;
    maxAttempts:  number;
    feedback:     GuessFeedback;
    /** Renseigné uniquement quand la partie est terminée (victoire ou défaite). */
    solution?:    RosterEntry;
    /** Renseigné uniquement en cas de victoire. */
    pointsEarned?: number;
}

// ── Constantes ──────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 6;
const DATASET_TTL_MS = 6 * 60 * 60 * 1000; // 6 h — recalcul quotidien suffisant

/**
 * Barème dégressif : moins d'essais = plus de points. Index = essais - 1.
 * Reste sous la limite de 100 pts/partie imposée par GamesService.rewardUser.
 */
const POINTS_BY_ATTEMPT = [50, 40, 30, 25, 15, 10];

function pointsForAttempts(attempts: number): number {
    const idx = Math.min(Math.max(attempts, 1), MAX_ATTEMPTS) - 1;
    return POINTS_BY_ATTEMPT[idx];
}

/**
 * Année de début en F1 par pilote (clé = driverId Ergast). Faits historiques
 * immuables : une table statique est plus fiable que ~20 appels Ergast/Jolpi par
 * pilote (rate-limit / latence). Un pilote absent de la table retombe sur l'année
 * courante côté buildDataset — ce qui correspond, en pratique, à un débutant.
 */
const DEBUT_YEARS: Record<string, number> = {
    alonso:          2001,
    raikkonen:       2001,
    hamilton:        2007,
    vettel:          2007,
    grosjean:        2009,
    hulkenberg:      2010,
    perez:           2011,
    ricciardo:       2011,
    bottas:          2013,
    kevin_magnussen: 2014,
    max_verstappen:  2015,
    sainz:           2015,
    ocon:            2016,
    gasly:           2017,
    stroll:          2017,
    leclerc:         2018,
    norris:          2019,
    russell:         2019,
    albon:           2019,
    latifi:          2020,
    tsunoda:         2021,
    mick_schumacher: 2021,
    zhou:            2022,
    de_vries:        2022,
    piastri:         2023,
    sargeant:        2023,
    lawson:          2023,
    bearman:         2024,
    colapinto:       2024,
    doohan:          2025,
    antonelli:       2025,
    kimi_antonelli:  2025,
    hadjar:          2025,
    bortoleto:       2025,
};

// ── Comparaison (fonctions pures, testables sans réseau) ─────────────────────

function categorical(guess: string, target: string): CategoricalFeedback {
    const norm = (s: string) => s.trim().toLowerCase();
    return { value: guess, status: norm(guess) === norm(target) ? "exact" : "wrong" };
}

function numeric(guess: number, target: number): NumericFeedback {
    let status: NumericStatus = "exact";
    if (target > guess) status = "higher"; // la réponse est plus haute que le guess
    else if (target < guess) status = "lower";
    return { value: guess, status };
}

/**
 * Compare deux pilotes attribut par attribut. Les flèches (`higher`/`lower`)
 * indiquent la direction du pilote CIBLE par rapport au pilote deviné.
 */
export function compareDrivers(guess: DriverDleDriver, target: DriverDleDriver): GuessFeedback {
    return {
        driverId:             guess.driverId,
        fullName:             guess.fullName,
        headshotUrl:          guess.headshotUrl,
        team:                 categorical(guess.teamName, target.teamName),
        nationality:          categorical(guess.nationality, target.nationality),
        debutYear:            numeric(guess.debutYear, target.debutYear),
        wins:                 numeric(guess.wins, target.wins),
        podiums:              numeric(guess.podiums, target.podiums),
    };
}

// ── Helpers date / sélection déterministe ────────────────────────────────────

/** Clé du jour en UTC (reset à minuit UTC), ex. "2026-07-17". */
function dayKeyUTC(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

/** Hash déterministe simple (djb2). */
function hashString(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = (h * 33) ^ s.charCodeAt(i);
    }
    return h >>> 0; // non signé
}

// ── Service ──────────────────────────────────────────────────────────────────

export class DriverDleService {
    // Cache mémoire dédié (TTL long) — un guess ne doit jamais déclencher
    // d'appel réseau externe.
    private cache: { data: DriverDleDriver[]; expiresAt: number } | null = null;

    // Suivi léger des essais en cours, par utilisateur et par jour. En mémoire :
    // un redémarrage réinitialise le compteur d'essais d'une partie en cours,
    // mais le quota "1 partie/jour" reste garanti par GamePlayModel en base.
    private attempts = new Map<number, { dayKey: string; count: number }>();

    constructor(
        private readonly openf1 = new OpenF1Service(),
        private readonly games  = new GamesService(),
    ) {}

    // ── Dataset ───────────────────────────────────────────────────────────────

    /** Construit le dataset en combinant grille, classement et podiums. */
    private async buildDataset(): Promise<DriverDleDriver[]> {
        const [roster, standings, podiums] = await Promise.all([
            this.openf1.getDrivers("latest"),
            this.openf1.getDriverStandings(),
            this.computePodiums(),
        ]);

        const standingsByNumber = new Map<number, any>();
        for (const s of standings) {
            if (typeof s.driver_number === "number") standingsByNumber.set(s.driver_number, s);
        }

        const currentYear = new Date().getUTCFullYear();

        // Déduplication de la grille par numéro de course.
        const byNumber = new Map<number, DriverDleDriver>();
        for (const d of roster) {
            if (typeof d.driver_number !== "number") continue;
            const s = standingsByNumber.get(d.driver_number);
            const driverId: string | undefined = s?.driver?.driver_id;
            byNumber.set(d.driver_number, {
                driverId:             String(d.driver_number),
                fullName:             d.full_name ?? s?.driver?.full_name ?? `#${d.driver_number}`,
                teamName:             d.team_name ?? s?.driver?.team_name ?? "Unknown",
                nationality:          s?.driver?.nationality ?? d.country_code ?? "Unknown",
                driverNumber:         d.driver_number,
                // Année inconnue (pilote hors table) ⇒ probablement un débutant
                // de la saison en cours.
                debutYear:            (driverId ? DEBUT_YEARS[driverId] : undefined) ?? currentYear,
                headshotUrl:          d.headshot_url ?? null,
                wins:                 s ? Number(s.wins) : 0,
                podiums:              podiums.get(d.driver_number) ?? 0,
            });
        }

        return [...byNumber.values()];
    }

    /**
     * Podiums de la saison en cours : agrégation des top 3 de chaque course via
     * l'API Ergast/Jolpi (résultats par position 1, 2, 3). Échec réseau toléré
     * (retourne les podiums partiels / vides sans planter le dataset).
     */
    private async computePodiums(year?: number): Promise<Map<number, number>> {
        const podiums = new Map<number, number>();
        const y = year ?? "current";
        for (const position of [1, 2, 3]) {
            try {
                const url = `https://api.jolpi.ca/ergast/f1/${y}/results/${position}.json?limit=100`;
                const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
                if (!res.ok) continue;
                const data = await res.json();
                const races = data?.MRData?.RaceTable?.Races ?? [];
                for (const race of races) {
                    for (const r of race.Results ?? []) {
                        const num = Number(r?.Driver?.permanentNumber);
                        if (!Number.isFinite(num)) continue;
                        podiums.set(num, (podiums.get(num) ?? 0) + 1);
                    }
                }
            } catch (e) {
                logger.warn({ err: e instanceof Error ? e.message : String(e), position }, "[DriverDle] Podium fetch failed");
            }
        }
        return podiums;
    }

    /** Dataset caché ; sert la dernière version connue si l'appel externe échoue. */
    async getDataset(): Promise<DriverDleDriver[]> {
        const now = Date.now();
        if (this.cache && now < this.cache.expiresAt) return this.cache.data;

        try {
            const data = await this.buildDataset();
            if (data.length > 0) {
                this.cache = { data, expiresAt: now + DATASET_TTL_MS };
                return data;
            }
            // Dataset vide (API verrouillée pendant une session live) → on sert le cache.
            if (this.cache) return this.cache.data;
            return data;
        } catch (e) {
            logger.error({ err: e instanceof Error ? e.message : String(e) }, "[DriverDle] Dataset build failed");
            if (this.cache) return this.cache.data;
            throw new AppError(502, "Impossible de charger les données pilotes", "DRIVER_DLE_DATASET_UNAVAILABLE");
        }
    }

    /** Roster public pour l'autocomplete (ne révèle pas le pilote du jour). */
    async getRoster(): Promise<RosterEntry[]> {
        const dataset = await this.getDataset();
        return dataset
            .map((d) => ({
                driverId:     d.driverId,
                fullName:     d.fullName,
                teamName:     d.teamName,
                driverNumber: d.driverNumber,
                nationality:  d.nationality,
                headshotUrl:  d.headshotUrl,
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    // ── Sélection du pilote du jour ───────────────────────────────────────────

    /** Pilote du jour, déterministe à partir de la date UTC courante. */
    getTargetDriver(dataset: DriverDleDriver[], date = new Date()): DriverDleDriver {
        if (dataset.length === 0) throw httpErrors.notFound("Aucun pilote disponible");
        // Tri stable pour que la sélection ne dépende pas de l'ordre de l'API.
        const sorted = [...dataset].sort((a, b) => a.driverNumber - b.driverNumber);
        const idx = hashString(dayKeyUTC(date)) % sorted.length;
        return sorted[idx];
    }

    private toSolution(d: DriverDleDriver): RosterEntry {
        return {
            driverId:     d.driverId,
            fullName:     d.fullName,
            teamName:     d.teamName,
            driverNumber: d.driverNumber,
            nationality:  d.nationality,
            headshotUrl:  d.headshotUrl,
        };
    }

    // ── Essais en cours ───────────────────────────────────────────────────────

    private nextAttempt(userId: number): number {
        const today = dayKeyUTC();
        const entry = this.attempts.get(userId);
        const count = entry && entry.dayKey === today ? entry.count + 1 : 1;
        this.attempts.set(userId, { dayKey: today, count });
        return count;
    }

    private clearAttempts(userId: number): void {
        this.attempts.delete(userId);
    }

    // ── Guess ─────────────────────────────────────────────────────────────────

    /**
     * Traite une tentative. Vérifie le quota (1 partie/jour), calcule le feedback
     * attribut par attribut, et — quand la partie se termine — enregistre la
     * partie via GamesService (récompense en cas de victoire, partie neutre sinon).
     */
    async guess(userId: number, driverId: string, isAdmin: boolean): Promise<GuessResult> {
        // Une partie déjà enregistrée aujourd'hui ⇒ quota atteint.
        if (!isAdmin) {
            const played = await this.games.countPlaysToday(userId, "driver-dle");
            if (played >= 1) {
                throw httpErrors.forbidden("Tu as déjà joué aujourd'hui. Reviens demain !");
            }
        }

        const dataset = await this.getDataset();
        const guessDriver = dataset.find((d) => d.driverId === String(driverId));
        if (!guessDriver) throw httpErrors.badRequest("Pilote inconnu");

        const target = this.getTargetDriver(dataset);
        const feedback = compareDrivers(guessDriver, target);
        const found = guessDriver.driverId === target.driverId;

        const attemptsUsed = this.nextAttempt(userId);
        const gameOver = found || attemptsUsed >= MAX_ATTEMPTS;

        const result: GuessResult = {
            found,
            gameOver,
            attemptsUsed,
            maxAttempts: MAX_ATTEMPTS,
            feedback,
        };

        if (found) {
            const points = pointsForAttempts(attemptsUsed);
            await this.games.rewardUser(userId, points, "driver-dle", isAdmin, attemptsUsed);
            result.pointsEarned = points;
            result.solution = this.toSolution(target);
            this.clearAttempts(userId);
        } else if (gameOver) {
            // Défaite : on consomme le quota du jour sans récompense ni classement.
            await this.games.recordFalseStart(userId, "driver-dle", isAdmin);
            result.solution = this.toSolution(target);
            this.clearAttempts(userId);
        }

        return result;
    }
}
