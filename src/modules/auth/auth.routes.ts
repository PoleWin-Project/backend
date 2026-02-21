import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateBody } from "../../common/middleware/validate";
import { requireAuth } from "../../common/security/requireAuth";
import { authLimiter } from "../../common/middleware/rateLimiter";
import { RegisterDto, LoginDto, DeleteAccountDto } from "./auth.dto";

const router = Router();
const controller = new AuthController();

router.post("/auth/register", authLimiter, validateBody(RegisterDto), controller.register);
router.post("/auth/login",    authLimiter, validateBody(LoginDto),     controller.login);

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
