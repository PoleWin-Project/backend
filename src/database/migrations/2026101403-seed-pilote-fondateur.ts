import { QueryInterface } from "sequelize";

/**
 * Migration « no simulated gambling » — étape 4/4.
 *
 * Crée le badge « Pilote Fondateur », destiné aux utilisateurs inscrits AVANT la
 * bascule vers le modèle sans mise. Seule la définition du badge est insérée ici :
 * l'ATTRIBUTION est faite par le script de bascule (scripts/migrate-beta-season.ts).
 *
 * Le badge existant « Pionnier du Paddock » (pionnier_du_paddock) n'est volontairement
 * PAS modifié.
 */
const BADGE_CODE = "pilote_fondateur";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.sequelize.query(
        `INSERT INTO badges (name, code, description, image_url, rarity, created_at)
         SELECT :name, :code, :description, :imageUrl, :rarity, :now
         WHERE NOT EXISTS (SELECT 1 FROM badges WHERE code = :code)`,
        {
            replacements: {
                name:        "Pilote Fondateur",
                code:        BADGE_CODE,
                description: "Présent sur PoleWin pendant la Saison Bêta, avant le lancement du championnat.",
                // Visuel à fournir : en attendant, réutilise celui du Pionnier du Paddock.
                imageUrl:    "/badges/pionnier-du-paddock.png",
                rarity:      "legendary",
                now:         new Date(),
            },
        },
    );
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    // Les attributions (user_badges) partent en cascade avec le badge.
    await queryInterface.sequelize.query(
        `DELETE FROM badges WHERE code = :code`,
        { replacements: { code: BADGE_CODE } },
    );
}
