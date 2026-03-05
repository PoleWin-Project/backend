import { Router } from "express";
import { validateQuery } from "../../common/middleware/validate";
import { ListChatChannelsQueryDto } from "./chatChannels.dto";
import { ChatChannelsController } from "./chatChannels.controller";

const router = Router();
const controller = new ChatChannelsController();

router.get(
    "/race-sessions/:sessionId/chat-channels",
    validateQuery(ListChatChannelsQueryDto),
    controller.listBySession,
);
router.get("/chat-channels/:id", controller.getById);

export default router;
