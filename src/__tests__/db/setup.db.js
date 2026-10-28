/**
 * Environnement des tests d'intégration DB (exécuté avant l'import des modules).
 * dotenv ne remplace pas les variables déjà définies : ces valeurs l'emportent sur .env,
 * ce qui empêche notamment de viser par erreur la base configurée dans .env.
 */
const url = process.env.TEST_DATABASE_URL || "postgresql://polewin:polewin@localhost:5432/polewin_test";
const dbName = new URL(url).pathname.replace(/^\//, "");
if (!dbName.endsWith("_test")) {
    throw new Error(`Refus : la base de test doit se terminer par "_test" (reçu "${dbName}")`);
}
process.env.DATABASE_URL         = url;
process.env.JWT_SECRET           = "test_jwt_secret_minimum_16_characters_for_test";
process.env.VERIFY_EMAIL_SECRET  = "test_verify_email_secret_minimum_16_chars";
process.env.NODE_ENV             = "test";
process.env.PORT                 = "3002";
process.env.CORS_ORIGIN          = "http://localhost:3000";
process.env.SCORING_MODEL        = "championship";
process.env.AUTORESOLVE_ENABLED  = "false";
