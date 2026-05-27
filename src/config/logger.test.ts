describe("config/logger — niveau de log", () => {
    it("utilise le niveau 'info' en production", () => {
        let loggerInstance: any;

        jest.isolateModules(() => {
            jest.doMock("./env", () => ({
                env: { nodeEnv: "production" },
            }));
            jest.doMock("pino", () =>
                jest.fn().mockImplementation((opts: any) => ({ level: opts.level, opts })),
            );

            const { logger } = require("./logger");
            loggerInstance = logger;
        });

        expect(loggerInstance.level).toBe("info");
        expect(loggerInstance.opts.transport).toBeUndefined();
    });

    it("utilise le niveau 'debug' hors production", () => {
        let loggerInstance: any;

        jest.isolateModules(() => {
            jest.doMock("./env", () => ({
                env: { nodeEnv: "development" },
            }));
            jest.doMock("pino", () =>
                jest.fn().mockImplementation((opts: any) => ({ level: opts.level, opts })),
            );

            const { logger } = require("./logger");
            loggerInstance = logger;
        });

        expect(loggerInstance.level).toBe("debug");
        expect(loggerInstance.opts.transport).toBeDefined();
    });
});
