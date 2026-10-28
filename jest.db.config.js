/**
 * Tests d'intégration sur un VRAI PostgreSQL (concurrence, idempotence, contraintes).
 * Base par défaut : postgresql://polewin:polewin@localhost:5432/polewin_test
 * (surcharger avec TEST_DATABASE_URL). Le nom de la base DOIT finir par `_test` :
 * les tables y sont vidées entre chaque test.
 *
 *   npm run test:db
 *
 * @type {import('jest').Config}
 */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/*.db.test.ts"],
    clearMocks: true,
    setupFiles: ["<rootDir>/src/__tests__/db/setup.db.js"],
    forceExit: true,
    testTimeout: 30000,
};
