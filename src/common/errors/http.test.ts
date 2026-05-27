import { httpErrors } from "./http";
import { AppError } from "./AppError";

describe("httpErrors", () => {
    it("badRequest — 400", () => {
        const err = httpErrors.badRequest();
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe("BAD_REQUEST");
    });

    it("unauthorized — 401", () => {
        const err = httpErrors.unauthorized("Not allowed");
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe("Not allowed");
    });

    it("forbidden — 403", () => {
        expect(httpErrors.forbidden().statusCode).toBe(403);
    });

    it("notFound — 404", () => {
        const err = httpErrors.notFound("User not found");
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe("User not found");
    });

    it("conflict — 409", () => {
        expect(httpErrors.conflict().statusCode).toBe(409);
    });

    it("unprocessableEntity — 422", () => {
        const err = httpErrors.unprocessableEntity("Invalid field");
        expect(err.statusCode).toBe(422);
        expect(err.code).toBe("UNPROCESSABLE_ENTITY");
        expect(err.message).toBe("Invalid field");
    });

    it("code personnalisé", () => {
        const err = httpErrors.badRequest("Email invalid", "EMAIL_INVALID");
        expect(err.code).toBe("EMAIL_INVALID");
    });

    it("unauthorized — default params", () => {
        const err = httpErrors.unauthorized();
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe("Unauthorized");
        expect(err.code).toBe("UNAUTHORIZED");
    });

    it("notFound — default params", () => {
        const err = httpErrors.notFound();
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe("Not found");
        expect(err.code).toBe("NOT_FOUND");
    });

    it("unprocessableEntity — default params", () => {
        const err = httpErrors.unprocessableEntity();
        expect(err.statusCode).toBe(422);
        expect(err.message).toBe("Unprocessable entity");
        expect(err.code).toBe("UNPROCESSABLE_ENTITY");
    });
});
