/**
 * Fichier JS (pas TS) pour éviter tout problème de compilation ts-jest.
 * S'exécute avant chaque fichier de test, avant que les modules soient importés.
 * dotenv ne remplace pas les vars déjà définies → ces valeurs prennent la priorité sur .env.
 */
process.env.DATABASE_URL        = "postgresql://test:test@localhost:5432/testdb";
process.env.JWT_SECRET          = "test_jwt_secret_minimum_16_characters_for_test";
process.env.VERIFY_EMAIL_SECRET = "test_verify_email_secret_minimum_16_chars";
process.env.NODE_ENV            = "test";
process.env.PORT                = "3001";
process.env.CORS_ORIGIN         = "http://localhost:3000";
