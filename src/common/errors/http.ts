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
};
