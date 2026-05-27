describe("config/env — error path", () => {
    it("throw en mode test quand les variables sont invalides", () => {
        let caught: Error | null = null;

        jest.isolateModules(() => {
            // Prevent dotenv from loading the .env file
            jest.doMock("dotenv/config", () => ({}));

            const originalDbUrl = process.env.DATABASE_URL;
            delete process.env.DATABASE_URL;

            try {
                require("./env");
            } catch (e: any) {
                caught = e;
            } finally {
                if (originalDbUrl !== undefined) {
                    process.env.DATABASE_URL = originalDbUrl;
                }
            }
        });

        expect(caught).not.toBeNull();
        expect((caught as any).message).toContain("Invalid environment variables");
    });

    it("utilise les secrets optionnels quand définis, JWT_SECRET sinon", () => {
        let envInstance: any;

        jest.isolateModules(() => {
            jest.doMock("dotenv/config", () => ({}));

            const origVerify  = process.env.VERIFY_EMAIL_SECRET;
            const origRefresh = process.env.REFRESH_TOKEN_SECRET;
            const origReset   = process.env.RESET_PASSWORD_SECRET;

            // Remove VERIFY so line 61 takes the right (?? JWT_SECRET) branch
            delete process.env.VERIFY_EMAIL_SECRET;
            // Set REFRESH and RESET so lines 62-63 take the left branch
            process.env.REFRESH_TOKEN_SECRET  = "r".repeat(16);
            process.env.RESET_PASSWORD_SECRET = "s".repeat(16);

            try {
                const { env } = require("./env");
                envInstance = env;
            } finally {
                if (origVerify  !== undefined) process.env.VERIFY_EMAIL_SECRET  = origVerify;
                else delete process.env.VERIFY_EMAIL_SECRET;
                if (origRefresh !== undefined) process.env.REFRESH_TOKEN_SECRET = origRefresh;
                else delete process.env.REFRESH_TOKEN_SECRET;
                if (origReset   !== undefined) process.env.RESET_PASSWORD_SECRET = origReset;
                else delete process.env.RESET_PASSWORD_SECRET;
            }
        });

        expect(envInstance.refreshTokenSecret).toBe("r".repeat(16));
        expect(envInstance.resetPasswordSecret).toBe("s".repeat(16));
        // VERIFY_EMAIL_SECRET not set → falls back to JWT_SECRET
        expect(envInstance.verifyEmailSecret).toBe(process.env.JWT_SECRET);
    });

    it("utilise JWT_SECRET pour les secrets optionnels quand ils ne sont pas définis (lignes 62-63)", () => {
        let envInstance: any;

        jest.isolateModules(() => {
            jest.doMock("dotenv/config", () => ({}));

            const origRefresh = process.env.REFRESH_TOKEN_SECRET;
            const origReset   = process.env.RESET_PASSWORD_SECRET;

            // Remove both optional secrets → they fall back to JWT_SECRET (right branches of ??)
            delete process.env.REFRESH_TOKEN_SECRET;
            delete process.env.RESET_PASSWORD_SECRET;

            try {
                const { env } = require("./env");
                envInstance = env;
            } finally {
                if (origRefresh !== undefined) process.env.REFRESH_TOKEN_SECRET = origRefresh;
                else delete process.env.REFRESH_TOKEN_SECRET;
                if (origReset   !== undefined) process.env.RESET_PASSWORD_SECRET = origReset;
                else delete process.env.RESET_PASSWORD_SECRET;
            }
        });

        // Both undefined → fallback to JWT_SECRET (right branches of ??)
        expect(envInstance.refreshTokenSecret).toBe(process.env.JWT_SECRET);
        expect(envInstance.resetPasswordSecret).toBe(process.env.JWT_SECRET);
    });

    it("appelle process.exit(1) en mode production quand les variables sont invalides", () => {
        const mockExit = jest.spyOn(process, "exit").mockImplementation((() => {}) as any);
        let caught: Error | null = null;

        jest.isolateModules(() => {
            jest.doMock("dotenv/config", () => ({}));

            const originalDbUrl  = process.env.DATABASE_URL;
            const originalNodeEnv = process.env.NODE_ENV;

            delete process.env.DATABASE_URL;
            process.env.NODE_ENV = "production";

            try {
                require("./env");
            } catch (e: any) {
                caught = e;
            } finally {
                if (originalDbUrl !== undefined) process.env.DATABASE_URL = originalDbUrl;
                process.env.NODE_ENV = originalNodeEnv;
            }
        });

        expect(mockExit).toHaveBeenCalledWith(1);
        mockExit.mockRestore();
    });
});
