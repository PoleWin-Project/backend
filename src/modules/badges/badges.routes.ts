import { Router } from "express";
import { BadgesController } from "./badges.controller";
import { requireAuth, requireRole } from "../../common/security/requireAuth";
import { validateBody } from "../../common/middleware/validate";
import { CreateBadgeDto, UpdateBadgeDto, AwardBadgeDto } from "./badges.dto";

const router = Router();
const ctrl = new BadgesController();

router.get("/users/me/badges",   requireAuth,               ctrl.myBadges);
router.get("/users/:id/badges",                             ctrl.userBadges);

router.get("/admin/badges",                requireRole("admin"),                              ctrl.listBadges);
router.post("/admin/badges",               requireRole("admin"), validateBody(CreateBadgeDto), ctrl.createBadge);
router.patch("/admin/badges/:badgeId",     requireRole("admin"), validateBody(UpdateBadgeDto), ctrl.updateBadge);
router.delete("/admin/badges/:badgeId",    requireRole("admin"),                              ctrl.deleteBadge);

router.post("/admin/users/:id/badges",              requireRole("admin"), validateBody(AwardBadgeDto), ctrl.awardBadge);
router.delete("/admin/users/:id/badges/:badgeId",   requireRole("admin"),                              ctrl.revokeBadge);

export default router;
