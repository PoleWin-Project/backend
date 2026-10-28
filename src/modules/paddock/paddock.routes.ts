import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../common/security/requireAuth";
import { validateBody } from "../../common/middleware/validate";
import { paddockService } from "./paddock.service";
const router = Router();
router.get('/paddock', requireAuth, async (req, res, next) => {
    try { res.json({ status: 'ok', ...await paddockService.catalog(req.user!.id) }); } catch (e) { next(e); }
});
router.post('/paddock/purchases', requireAuth, validateBody(z.object({ code: z.string().min(1).max(64) })), async (req, res, next) => {
    try { res.json({ status: 'ok', ...await paddockService.purchase(req.user!.id, req.body.code) }); } catch (e) { next(e); }
});
router.put('/paddock/equipment', requireAuth, validateBody(z.object({ kind: z.enum(['frame', 'title', 'helmet', 'suit', 'background']), code: z.string().min(1).max(64).nullable() })), async (req, res, next) => {
    try { res.json({ status: 'ok', cosmetics: await paddockService.equip(req.user!.id, req.body.kind, req.body.code) }); } catch (e) { next(e); }
});
export default router;
