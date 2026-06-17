import { Router } from "express";
import { requireAuth } from "../../common/security/requireAuth";
import { validateBody } from "../../common/middleware/validate";
import { RegisterPushTokenDto, RemovePushTokenDto } from "./push.dto";
import { PushController } from "./push.controller";

const router = Router();
const ctrl   = new PushController();

router.post("/push/tokens",   requireAuth, validateBody(RegisterPushTokenDto), ctrl.register);
router.delete("/push/tokens", requireAuth, validateBody(RemovePushTokenDto),   ctrl.remove);

export default router;
