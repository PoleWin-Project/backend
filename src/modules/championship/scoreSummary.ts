import { BadgeModel, UserBadgeModel } from "../../database/models";
import { isChampionshipMode } from "../../config/env";
import { championshipService } from "./championship.service";
import { garageService } from "../garage/garage.service";
import { seasonsService } from "../seasons/seasons.service";

import { paddockService } from "../paddock/paddock.service";

export const PIONEER_BADGE_CODE = "pionnier_du_paddock";

/**
 * Champs de score exposés au client (auth, /auth/me, profil).
 *
 * Les deux ressources sont TOUJOURS renvoyées séparément pour qu'aucun écran ne
 * puisse les confondre :
 *  - championshipPoints : score de la saison active (classement uniquement) ;
 *  - garageCredits      : monnaie cosmétique.
 *
 * `points` est conservé TEMPORAIREMENT pour les anciennes versions de l'app :
 *  - legacy       → ancien solde profiles.points ;
 *  - championship → alias de championshipPoints (jamais un solde « disponible »).
 * À supprimer une fois tous les clients migrés (plan §11.4).
 */
export async function getScoreFields(userId: number, legacyProfilePoints: number) {
    const [score, garageCredits, isPioneer, betaSeason, cosmetics, seasonHistory] = await Promise.all([
        championshipService.getActiveSeasonScore(userId),
        garageService.getBalance(userId),
        hasPioneerBadge(userId),
        seasonsService.getBetaResult(userId),
        paddockService.appearance(userId),
        seasonsService.getHistory(userId),
    ]);

    return {
        points: isChampionshipMode() ? score.points : legacyProfilePoints,
        championshipPoints: score.points,
        championshipSeason: score.season,
        garageCredits,
        isPioneer,
        cosmetics,
        betaSeason,
        seasonHistory,
    };
}

async function hasPioneerBadge(userId: number): Promise<boolean> {
    const count = await UserBadgeModel.count({
        where: { userId },
        include: [{ model: BadgeModel, as: "badge", where: { code: PIONEER_BADGE_CODE }, required: true }],
    });
    return count > 0;
}

/**
 * Mode championship : remplace, dans une réponse API, chaque `profile.points` (ancien
 * solde gelé de la Saison Bêta) par les points de championnat de la saison active.
 * Fonctionne sur toute structure contenant des objets `{ id, profile: { points } }`
 * (utilisateur, expéditeur/destinataire d'une demande d'ami…).
 * En mode legacy, la donnée est renvoyée telle quelle.
 */
export async function withSeasonPoints<T>(data: T): Promise<T> {
    if (!isChampionshipMode() || data == null) return data;

    const plain = JSON.parse(JSON.stringify(data));
    const holders: { id: number; profile: { points: number } }[] = [];
    const walk = (node: unknown) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== "object") return;
        const obj = node as Record<string, any>;
        if (typeof obj.id === "number" && obj.profile && typeof obj.profile === "object" && "points" in obj.profile) {
            holders.push(obj as any);
        }
        Object.values(obj).forEach(walk);
    };
    walk(plain);
    if (!holders.length) return plain;

    const pointsByUser = await championshipService.getActiveSeasonPoints([...new Set(holders.map((h) => h.id))]);
    for (const h of holders) h.profile.points = pointsByUser.get(h.id) ?? 0;
    return plain;
}
