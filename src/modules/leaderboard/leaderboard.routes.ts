import { Router } from "express";
import { requireAuth } from "../../common/security/requireAuth";
import { validateQuery } from "../../common/middleware/validate";
import { LeaderboardQueryDto } from "./leaderboard.dto";
import { LeaderboardController } from "./leaderboard.controller";

const router = Router();
const ctrl   = new LeaderboardController();

// ── Global ────────────────────────────────────────────────────────────────────
router.get("/leaderboard",     validateQuery(LeaderboardQueryDto), ctrl.getGlobal);
router.get("/leaderboard/me",  requireAuth, ctrl.getMyRank);

// ── League ────────────────────────────────────────────────────────────────────
router.get("/leaderboard/leagues/:leagueId",
    validateQuery(LeaderboardQueryDto),
    ctrl.getByLeague,
);

// ── Session ───────────────────────────────────────────────────────────────────
router.get("/leaderboard/sessions/:sessionId",
    validateQuery(LeaderboardQueryDto),
    ctrl.getBySession,
);

router.get("/leaderboard/sessions/:sessionId/leagues/:leagueId",
    validateQuery(LeaderboardQueryDto),
    ctrl.getBySessionAndLeague,
);

export default router;
