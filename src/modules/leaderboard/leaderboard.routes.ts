import { Router } from "express";
import { LeaderboardController } from "./leaderboard.controller";

const router = Router();
const ctrl = new LeaderboardController();

router.get("/leaderboard",                      ctrl.getGlobal);
router.get("/leaderboard/leagues/:leagueId",    ctrl.getByLeague);

export default router;
