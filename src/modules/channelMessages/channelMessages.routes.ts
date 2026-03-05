import { Router } from "express";
import { requireAuth, requireRole } from "../../common/security/requireAuth";
import { validateBody, validateQuery } from "../../common/middleware/validate";
import { CreateChannelMessageDto, ListChannelMessagesQueryDto } from "./channelMessages.dto";
import { ChannelMessagesController } from "./channelMessages.controller";

const router = Router();
const controller = new ChannelMessagesController();

router.get(
    "/chat-channels/:channelId/channel-messages",
    validateQuery(ListChannelMessagesQueryDto),
    controller.listByChannel,
);
router.get("/channel-messages/:id", controller.getById);

router.post(
    "/chat-channels/:channelId/channel-messages",
    requireAuth,
    validateBody(CreateChannelMessageDto),
    controller.create,
);
router.delete("/admin/channel-messages/:id", requireRole("admin"), controller.delete);

export default router;
