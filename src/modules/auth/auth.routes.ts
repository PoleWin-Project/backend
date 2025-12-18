import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateBody } from "../../common/middleware/validate";
import { requireAuth } from "../../common/security/requireAuth";
import { RegisterDto, LoginDto, DeleteAccountDto } from "./auth.dto";

const router = Router();
const controller = new AuthController();

router.post("/auth/register", validateBody(RegisterDto), controller.register);
router.post("/auth/login", validateBody(LoginDto), controller.login);

router.get("/auth/verify-email", controller.verifyEmail);

router.post(
    "/auth/resend-verify-email",
    requireAuth,
    controller.resendVerifyEmail
);
router.delete(
    "/auth/delete-account",
    requireAuth,
    validateBody(DeleteAccountDto),
    controller.deleteAccount
);

export default router;
