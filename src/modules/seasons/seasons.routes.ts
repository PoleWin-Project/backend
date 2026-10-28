import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../../common/security/requireAuth";
import { httpErrors } from "../../common/errors/http";
import { seasonsService } from "./seasons.service";
import { championshipService } from "../championship/championship.service";

/**
 * Saisons de championnat (lecture). L'archivage / l'ouverture d'une saison se fait
 * aujourd'hui par le script de bascule (scripts/migrate-beta-season.ts).
 */
const router = Router();

router.get("/seasons", async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const seasons = await seasonsService.listSeasons();
        res.json({ status: "ok", seasons });
    } catch (e) { next(e); }
});

router.get("/seasons/current", async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const season = await seasonsService.getActiveSeason();
        if (!season) throw httpErrors.notFound("No active season", "NO_ACTIVE_SEASON");
        res.json({ status: "ok", season });
    } catch (e) { next(e); }
});

/** Score de championnat de l'utilisateur connecté dans la saison active. */
router.get("/users/me/championship", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [score, betaSeason] = await Promise.all([
            championshipService.getActiveSeasonScore(req.user!.id),
            seasonsService.getBetaResult(req.user!.id),
        ]);
        res.json({ status: "ok", ...score, betaSeason });
    } catch (e) { next(e); }
});

export default router;
