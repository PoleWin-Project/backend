import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../../common/security/requireAuth";
import { validateQuery } from "../../common/middleware/validate";
import { garageService } from "./garage.service";

/**
 * Crédits Garage (monnaie cosmétique). Lecture seule pour l'instant :
 * aucune route ne permet au client de créditer son portefeuille.
 *
 * Routes futures (boutique, non implémentées — cf. plan §11.5) :
 *   GET  /garage/items
 *   POST /garage/purchases                (header Idempotency-Key obligatoire)
 *   POST /garage/iap/apple/verify | /garage/iap/google/verify  (validation serveur des reçus)
 */
const router = Router();

const TransactionsQueryDto = z.object({
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

router.get("/garage/wallet", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const balance = await garageService.getBalance(req.user!.id);
        res.json({ status: "ok", wallet: { garageCredits: balance } });
    } catch (e) { next(e); }
});

router.get(
    "/garage/transactions",
    requireAuth,
    validateQuery(TransactionsQueryDto),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { limit, offset } = req.query as unknown as z.infer<typeof TransactionsQueryDto>;
            const data = await garageService.listTransactions(req.user!.id, limit, offset);
            res.json({ status: "ok", ...data });
        } catch (e) { next(e); }
    },
);

export default router;
