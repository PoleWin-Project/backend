import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../common/security/requireAuth";
import { validateBody } from "../../common/middleware/validate";
import { challengesService } from "./challenges.service";

const router = Router();
router.get("/challenges/weekly", requireAuth, async (req, res, next) => {
    try { res.json({ status: "ok", ...await challengesService.list(req.user!.id) }); }
    catch (e) { next(e); }
});
router.post("/challenges/weekly/:id/claim", requireAuth,
    validateBody(z.object({ week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })),
    async (req, res, next) => {
        try { res.json({ status: "ok", ...await challengesService.claim(req.user!.id, String(req.params.id), req.body.week) }); }
        catch (e) { next(e); }
    });
export default router;
