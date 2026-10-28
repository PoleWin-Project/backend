import { Router } from "express";
import { WeekendsController } from "./weekends.controller";

const router = Router();
const ctrl = new WeekendsController();

router.get("/weekends/next", ctrl.next);
router.get("/weekends/:meetingKey", ctrl.get);

export default router;
