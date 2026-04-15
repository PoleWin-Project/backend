import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateBody } from "../../common/middleware/validate";
import { requireAuth } from "../../common/security/requireAuth";
import { authLimiter } from "../../common/middleware/rateLimiter";
import {
    RegisterDto,
    LoginDto,
    DeleteAccountDto,
    ChangePasswordDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    RefreshTokenDto,
} from "./auth.dto";

const router = Router();
const controller = new AuthController();

router.get("/auth/me",             requireAuth, controller.me);
router.post("/auth/register",       authLimiter, validateBody(RegisterDto),       controller.register);
router.post("/auth/login",          authLimiter, validateBody(LoginDto),           controller.login);
router.post("/auth/refresh",                     validateBody(RefreshTokenDto),     controller.refresh);
router.post("/auth/forgot-password", authLimiter, validateBody(ForgotPasswordDto), controller.forgotPassword);
router.post("/auth/reset-password",  authLimiter, validateBody(ResetPasswordDto),  controller.resetPassword);

router.get( "/auth/verify-email",        controller.verifyEmail);
router.post("/auth/resend-verify-email", requireAuth, controller.resendVerifyEmail);

router.post("/auth/change-password", requireAuth, validateBody(ChangePasswordDto), controller.changePassword);
router.delete(
    "/auth/delete-account",
    requireAuth,
    validateBody(DeleteAccountDto),
    controller.deleteAccount
);

export default router;
