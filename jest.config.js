/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/*.test.ts"],
    // Les tests *.db.test.ts nécessitent un vrai PostgreSQL : lancés via `npm run test:db`.
    testPathIgnorePatterns: ["/node_modules/", "\\.db\\.test\\.ts$"],
    clearMocks: true,
    setupFiles: ["<rootDir>/src/__tests__/setup.js"],
    forceExit: true,
};
