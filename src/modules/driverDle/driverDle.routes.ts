import { Router } from "express";
import { DriverDleController } from "./driverDle.controller";
import { requireAuth } from "../../common/security/requireAuth";

const router = Router();
const controller = new DriverDleController();

router.get("/roster", requireAuth, controller.roster);
router.post("/guess", requireAuth, controller.guess);

export default router;
