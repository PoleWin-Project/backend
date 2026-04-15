import { Router } from "express";
import { UsersController } from "./users.controller";
import { requireAuth, requireRole } from "../../common/security/requireAuth";
import { validateBody, validateQuery } from "../../common/middleware/validate";
import { AdminUpdateUserDto, ListUsersQueryDto, UpdateMeDto } from "./users.dto";

const router = Router();
const controller = new UsersController();

router.get("/users/me",       requireAuth, controller.me);
router.get("/users/me/stats", requireAuth, controller.myStats);
router.patch("/users/me",     requireAuth, validateBody(UpdateMeDto), controller.updateMe);
router.delete("/users/me",    requireAuth, controller.deleteMe);

router.get("/users/search",     requireAuth, controller.search);
router.get("/users/:id/public", controller.publicProfile);

router.get("/admin/users", requireRole("admin"), validateQuery(ListUsersQueryDto), controller.list);
router.patch("/admin/users/:id", requireRole("admin"), validateBody(AdminUpdateUserDto), controller.adminUpdate);

export default router;
