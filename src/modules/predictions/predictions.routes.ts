import { Router } from "express";
import { PredictionsController } from "./predictions.controller";
import { requireAuth, requireRole } from "../../common/security/requireAuth";
import { validateBody, validateQuery } from "../../common/middleware/validate";
import {
    CreatePredictionDto,
    ListMyPronosticsDto,
    PlacePronosticDto,
    ResolveDto,
    UpdatePredictionDto,
    UpdatePronosticDto,
} from "./predictions.dto";

const router = Router();
const ctrl = new PredictionsController();

// ── User (auth) ───────────────────────────────────────────────────────────────

router.get("/users/me/pronostics",                        requireAuth, validateQuery(ListMyPronosticsDto), ctrl.myPronostics);
router.get("/sessions/:sessionId/pronostics/me",          requireAuth, ctrl.myPronosticsForSession);

router.get("/sessions/:sessionId/predictions",                         ctrl.getBySession);
router.get("/predictions/:predictionId",                               ctrl.getById);

router.get("/predictions/:predictionId/pronostic",        requireAuth, ctrl.myPronostic);
router.post("/predictions/:predictionId/pronostic",       requireAuth, validateBody(PlacePronosticDto),   ctrl.placePronostic);
router.patch("/predictions/:predictionId/pronostic",      requireAuth, validateBody(UpdatePronosticDto),  ctrl.updatePronostic);
router.delete("/predictions/:predictionId/pronostic",     requireAuth, ctrl.cancelPronostic);

// ── Admin ─────────────────────────────────────────────────────────────────────

router.post("/admin/sessions/:sessionId/predictions",    requireRole("admin"), validateBody(CreatePredictionDto), ctrl.create);
router.patch("/admin/predictions/:predictionId",          requireRole("admin"), validateBody(UpdatePredictionDto), ctrl.update);
router.delete("/admin/predictions/:predictionId",         requireRole("admin"),                                    ctrl.delete);

router.get("/admin/predictions/:predictionId/pronostics", requireRole("admin"), ctrl.allPronostics);
router.post("/admin/predictions/:predictionId/resolve",   requireRole("admin"), validateBody(ResolveDto), ctrl.resolve);

export default router;
