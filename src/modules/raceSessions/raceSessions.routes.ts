import { Router } from "express";
import { requireRole } from "../../common/security/requireAuth";
import { validateBody, validateQuery } from "../../common/middleware/validate";
import {
    CreateRaceSessionDto,
    ListRaceSessionsQueryDto,
    UpdateRaceSessionDto,
} from "./raceSessions.dto";
import { RaceSessionsController } from "./raceSessions.controller";

const router = Router();
const controller = new RaceSessionsController();

router.get("/race-sessions", validateQuery(ListRaceSessionsQueryDto), controller.list);
router.get("/race-sessions/:id", controller.getById);

router.post("/admin/race-sessions", requireRole("admin"), validateBody(CreateRaceSessionDto), controller.create);
router.patch("/admin/race-sessions/:id", requireRole("admin"), validateBody(UpdateRaceSessionDto), controller.update);
router.delete("/admin/race-sessions/:id", requireRole("admin"), controller.delete);

router.post("/admin/race-sessions/import/openf1/latest", requireRole("admin"), controller.importLatestFromOpenF1);
router.post("/admin/race-sessions/import/openf1/:sessionKey", requireRole("admin"), controller.importFromOpenF1);

export default router;

