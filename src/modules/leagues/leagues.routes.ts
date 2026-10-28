import { Router } from "express";
import { requireAuth } from "../../common/security/requireAuth";
import { validateBody } from "../../common/middleware/validate";
import { CreateLeagueDto, JoinLeagueDto } from "./leagues.dto";
import { LeaguesController } from "./leagues.controller";

const router = Router();
const ctrl = new LeaguesController();

router.get("/leagues/me", requireAuth, ctrl.listMine);
router.post("/leagues", requireAuth, validateBody(CreateLeagueDto), ctrl.create);
router.post("/leagues/join", requireAuth, validateBody(JoinLeagueDto), ctrl.join);
router.get("/leagues/:id/members", requireAuth, ctrl.members);
router.delete("/leagues/:id/members/me", requireAuth, ctrl.leave);
router.delete("/leagues/:id", requireAuth, ctrl.delete);

export default router;
