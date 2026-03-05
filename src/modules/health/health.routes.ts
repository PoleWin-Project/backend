import { Router } from "express";
import * as controller from "./health.controller";

const router = Router();

router.get("/health",   controller.health);
router.get("/db-check", controller.dbCheck);
router.get("/version",  controller.version);

export default router;
