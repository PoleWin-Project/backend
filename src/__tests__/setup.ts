/**
 * Définit les variables d'environnement minimales avant que les modules
 * ne soient importés dans chaque fichier de test.
 * dotenv ne remplace pas les vars déjà définies, donc ces valeurs
 * ont la priorité sur celles du fichier .env.
 */
process.env.DATABASE_URL        = "postgresql://test:test@localhost:5432/testdb";
process.env.JWT_SECRET          = "test_jwt_secret_minimum_16_characters_for_test";
process.env.VERIFY_EMAIL_SECRET = "test_verify_email_secret_minimum_16_chars";
process.env.NODE_ENV            = "test";
process.env.PORT                = "0";
process.env.CORS_ORIGIN         = "http://localhost:3000";
