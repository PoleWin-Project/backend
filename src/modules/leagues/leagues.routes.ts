import { Router } from "express";
import { validateBody } from "../../common/middleware/validate";
import { requireAuth } from "../../common/security/requireAuth";
import { LeaguesController } from "./leagues.controller";
import { CreateLeagueDto, JoinLeagueDto, UpdateLeagueDto } from "./leagues.dto";

const router = Router();
const ctrl = new LeaguesController();

router.get("/leagues", requireAuth, ctrl.list);
router.post("/leagues", requireAuth, validateBody(CreateLeagueDto), ctrl.create);
router.post("/leagues/join", requireAuth, validateBody(JoinLeagueDto), ctrl.join);
router.get("/leagues/:id", requireAuth, ctrl.get);
router.patch("/leagues/:id", requireAuth, validateBody(UpdateLeagueDto), ctrl.update);
router.post("/leagues/:id/invite-code", requireAuth, ctrl.regenerateInvite);
router.delete("/leagues/:id/members/me", requireAuth, ctrl.leave);
router.delete("/leagues/:id/members/:userId", requireAuth, ctrl.removeMember);
router.delete("/leagues/:id", requireAuth, ctrl.delete);

export default router;
