import { Router } from "express";
import { GamesController } from "./games.controller";
import { jwtAuth } from "../../common/middleware/jwtAuth";

const router = Router();
const controller = new GamesController();

router.post("/reward", jwtAuth, controller.rewardUser);

export default router;
