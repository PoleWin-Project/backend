import { Router } from "express";
import { requireAuth } from "../../common/security/requireAuth";
import { validateBody } from "../../common/middleware/validate";
import { SendFriendRequestDto, RespondFriendRequestDto } from "./friends.dto";
import { FriendsController } from "./friends.controller";

const router = Router();
const ctrl   = new FriendsController();

// Friends list & status
router.get("/friends",                      requireAuth, ctrl.listFriends);
router.get("/friends/requests/incoming",    requireAuth, ctrl.listIncoming);
router.get("/friends/requests/outgoing",    requireAuth, ctrl.listOutgoing);
router.get("/friends/status/:userId",       requireAuth, ctrl.getStatus);

// Send / respond / cancel
router.post("/friends/requests",            requireAuth, validateBody(SendFriendRequestDto),    ctrl.sendRequest);
router.patch("/friends/requests/:id",       requireAuth, validateBody(RespondFriendRequestDto), ctrl.respond);
router.delete("/friends/requests/:id",      requireAuth, ctrl.cancelRequest);
router.delete("/friends/:userId",           requireAuth, ctrl.unfriend);

export default router;
