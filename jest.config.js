/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/*.test.ts"],
    clearMocks: true,
    setupFiles: ["<rootDir>/src/__tests__/setup.js"],
    forceExit: true,
};
