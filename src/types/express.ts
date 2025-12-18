import type { AuthUser } from "../common/security/auth.types";

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export {};
