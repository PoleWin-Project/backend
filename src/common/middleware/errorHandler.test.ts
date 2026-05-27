jest.mock("@sentry/node", () => ({ captureException: jest.fn() }));

import { errorHandler } from "./errorHandler";
import { AppError } from "../errors/AppError";
import * as Sentry from "@sentry/node";

function makeRes() {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as any;
}

const req  = {} as any;
const next = jest.fn() as any;

describe("errorHandler", () => {
    it("retourne 4xx pour AppError < 500", () => {
        const err = new AppError(404, "Not found", "NOT_FOUND");
        const res = makeRes();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.status().json).toHaveBeenCalledWith({
            status: "error",
            code: "NOT_FOUND",
            message: "Not found",
        });
    });

    it("log error et retourne 500 pour AppError >= 500", () => {
        const err = new AppError(500, "Internal", "INTERNAL_ERROR");
        const res = makeRes();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith(
            expect.objectContaining({ code: "INTERNAL_ERROR" }),
        );
    });

    it("capture Sentry et retourne 500 pour erreur générique", () => {
        const err = new Error("Unexpected");
        const res = makeRes();

        errorHandler(err, req, res, next);

        expect(Sentry.captureException).toHaveBeenCalledWith(err);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({
            status: "error",
            code: "INTERNAL_ERROR",
            message: "Internal server error",
        });
    });
});
