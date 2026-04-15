import { Router } from "express";
import { requireAuth } from "../../common/security/requireAuth";
import { validateBody, validateQuery } from "../../common/middleware/validate";
import { SendDmDto, ListDmsQueryDto } from "./dms.dto";
import { DmsController } from "./dms.controller";

const router = Router();
const ctrl   = new DmsController();

router.get("/dms",                          requireAuth, ctrl.listConversations);
router.get("/dms/unread",                   requireAuth, ctrl.unreadCount);
router.get("/dms/:userId",                  requireAuth, validateQuery(ListDmsQueryDto), ctrl.listConversation);
router.post("/dms/:userId",                 requireAuth, validateBody(SendDmDto), ctrl.send);

export default router;
