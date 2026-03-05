jest.mock("../modules/users/users.service", () => ({
    UsersService: jest.fn().mockImplementation(function (this: any) {
        this.getMe            = jest.fn();
        this.getPublicProfile = jest.fn();
        this.listUsers        = jest.fn();
        this.updateMe         = jest.fn();
        this.adminUpdateUser  = jest.fn();
    }),
}));

import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { UsersService } from "../modules/users/users.service";
import usersRoutes from "../modules/users/users.routes";
import { errorHandler } from "../common/middleware/errorHandler";
import { notFound } from "../common/middleware/notFound";
import { AppError } from "../common/errors/AppError";

const MockedClass = UsersService as jest.MockedClass<typeof UsersService>;
let svc: any;

beforeAll(() => {
    svc = MockedClass.mock.instances[0];
});

// ── App builders ─────────────────────────────────────────────────────────────

function buildApp(user?: { id: number; roles: string[] }) {
    const app = express();
    app.use(express.json());
    if (user) {
        app.use((req: Request, _res: Response, next: NextFunction) => {
            (req as any).user = user;
            next();
        });
    }
    app.use("/api/v1", usersRoutes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

const appPublic = buildApp();
const appUser   = buildApp({ id: 1, roles: ["user"] });
const appAdmin  = buildApp({ id: 1, roles: ["admin"] });

// ── Fixtures ─────────────────────────────────────────────────────────────────

const fakeUser = {
    id:       1,
    email:    "test@example.com",
    username: "testuser",
};

const fakeProfile = {
    id:          "1",
    username:    "testuser",
    displayName: "Test User",
    points:      100,
};

// ── GET /users/me ─────────────────────────────────────────────────────────────

describe("GET /api/v1/users/me", () => {
    it("returns current user", async () => {
        svc.getMe.mockResolvedValue(fakeUser);

        const res = await request(appUser).get("/api/v1/users/me");

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.user).toMatchObject({ id: 1, email: "test@example.com" });
        expect(svc.getMe).toHaveBeenCalledWith(1);
    });

    it("returns 401 without auth", async () => {
        const res = await request(appPublic).get("/api/v1/users/me");
        expect(res.status).toBe(401);
    });

    it("returns 404 when user not found", async () => {
        svc.getMe.mockRejectedValue(new AppError(404, "User not found"));

        const res = await request(appUser).get("/api/v1/users/me");
        expect(res.status).toBe(404);
    });
});

// ── PATCH /users/me ───────────────────────────────────────────────────────────

describe("PATCH /api/v1/users/me", () => {
    it("updates current user", async () => {
        const updated = { ...fakeUser, username: "newname" };
        svc.updateMe.mockResolvedValue(updated);

        const res = await request(appUser)
            .patch("/api/v1/users/me")
            .send({ username: "newname" });

        expect(res.status).toBe(200);
        expect(res.body.user.username).toBe("newname");
        expect(svc.updateMe).toHaveBeenCalledWith(1, { username: "newname" });
    });

    it("returns 401 without auth", async () => {
        const res = await request(appPublic)
            .patch("/api/v1/users/me")
            .send({ username: "newname" });

        expect(res.status).toBe(401);
    });

    it("returns 409 when username already taken", async () => {
        svc.updateMe.mockRejectedValue(new AppError(409, "Username already used"));

        const res = await request(appUser)
            .patch("/api/v1/users/me")
            .send({ username: "taken" });

        expect(res.status).toBe(409);
    });
});

// ── GET /users/:id/public ─────────────────────────────────────────────────────

describe("GET /api/v1/users/:id/public", () => {
    it("returns public profile", async () => {
        svc.getPublicProfile.mockResolvedValue(fakeProfile);

        const res = await request(appPublic).get("/api/v1/users/1/public");

        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({ username: "testuser" });
    });

    it("returns 404 when user not found", async () => {
        svc.getPublicProfile.mockRejectedValue(new AppError(404, "Not found"));

        const res = await request(appPublic).get("/api/v1/users/99/public");

        expect(res.status).toBe(404);
    });
});

// ── GET /admin/users ──────────────────────────────────────────────────────────

describe("GET /api/v1/admin/users", () => {
    it("returns paginated user list for admin", async () => {
        svc.listUsers.mockResolvedValue({
            items:   [fakeUser],
            total:   1,
            limit:   20,
            offset:  0,
            hasMore: false,
        });

        const res = await request(appAdmin).get("/api/v1/admin/users");

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.hasMore).toBe(false);
    });

    it("returns 401 without auth", async () => {
        const res = await request(appPublic).get("/api/v1/admin/users");
        expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin user", async () => {
        const res = await request(appUser).get("/api/v1/admin/users");
        expect(res.status).toBe(403);
    });
});

// ── PATCH /admin/users/:id ────────────────────────────────────────────────────

describe("PATCH /api/v1/admin/users/:id", () => {
    it("updates user as admin", async () => {
        const updated = { ...fakeUser, isEmailVerified: true };
        svc.adminUpdateUser.mockResolvedValue(updated);

        const res = await request(appAdmin)
            .patch("/api/v1/admin/users/1")
            .send({ isEmailVerified: true });

        expect(res.status).toBe(200);
        expect(svc.adminUpdateUser).toHaveBeenCalledWith(1, { isEmailVerified: true });
    });

    it("returns 403 for non-admin", async () => {
        const res = await request(appUser)
            .patch("/api/v1/admin/users/1")
            .send({ isEmailVerified: true });

        expect(res.status).toBe(403);
    });

    it("returns 404 when user not found", async () => {
        svc.adminUpdateUser.mockRejectedValue(new AppError(404, "User not found"));

        const res = await request(appAdmin)
            .patch("/api/v1/admin/users/99")
            .send({ roles: ["user"] });

        expect(res.status).toBe(404);
    });
});
