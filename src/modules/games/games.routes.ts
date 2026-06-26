import { Router } from "express";
import { GamesController } from "./games.controller";
import { requireAuth } from "../../common/security/requireAuth";

const router = Router();
const controller = new GamesController();

router.get("/plays-today",  requireAuth, controller.playsToday);
router.get("/leaderboard",  requireAuth, controller.leaderboard);
router.post("/reward",      requireAuth, controller.rewardUser);
router.post("/false-start", requireAuth, controller.falseStart);

export default router;
