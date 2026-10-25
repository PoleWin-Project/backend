import { AppError } from "./AppError";

export const httpErrors = {
    badRequest: (msg = "Bad request", code = "BAD_REQUEST") =>
        new AppError(400, msg, code),
    unauthorized: (msg = "Unauthorized", code = "UNAUTHORIZED") =>
        new AppError(401, msg, code),
    forbidden: (msg = "Forbidden", code = "FORBIDDEN") =>
        new AppError(403, msg, code),
    notFound: (msg = "Not found", code = "NOT_FOUND") =>
        new AppError(404, msg, code),
    conflict: (msg = "Conflict", code = "CONFLICT") =>
        new AppError(409, msg, code),
    unprocessableEntity: (msg = "Unprocessable entity", code = "UNPROCESSABLE_ENTITY") =>
        new AppError(422, msg, code),
    // Client trop ancien (ex. app qui envoie encore une mise après la bascule).
    upgradeRequired: (msg = "Upgrade required", code = "UPGRADE_REQUIRED") =>
        new AppError(426, msg, code),
    // Fonctionnalité temporairement indisponible (ex. gel pendant une maintenance).
    serviceUnavailable: (msg = "Service unavailable", code = "SERVICE_UNAVAILABLE") =>
        new AppError(503, msg, code),
};
