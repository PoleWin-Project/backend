import { Router } from "express";
import { SessionsController } from "./sessions.controller";
import { requireRole } from "../../common/security/requireAuth";
import { validateBody, validateQuery } from "../../common/middleware/validate";
import { CreateSessionDto, ListSessionsQueryDto, UpdateSessionDto } from "./sessions.dto";

const router = Router();
const ctrl = new SessionsController();

router.get("/sessions",              validateQuery(ListSessionsQueryDto), ctrl.list);
router.get("/sessions/:sessionId",                                        ctrl.getById);

router.post("/admin/sessions",            requireRole("admin"), validateBody(CreateSessionDto), ctrl.create);
router.patch("/admin/sessions/:sessionId", requireRole("admin"), validateBody(UpdateSessionDto), ctrl.update);
router.delete("/admin/sessions/:sessionId", requireRole("admin"),                               ctrl.delete);

export default router;
