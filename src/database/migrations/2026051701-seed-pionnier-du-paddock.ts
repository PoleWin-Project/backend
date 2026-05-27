import { QueryInterface } from "sequelize";

const BADGE_CODE = "pionnier_du_paddock";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    const now = new Date();

    const [result] = await queryInterface.sequelize.query(
        `INSERT INTO badges (name, code, description, image_url, rarity, created_at)
         SELECT :name, :code, :description, :imageUrl, :rarity, :now
         WHERE NOT EXISTS (SELECT 1 FROM badges WHERE code = :code)
         RETURNING id`,
        {
            replacements: {
                name:        "Pionnier du Paddock",
                code:        BADGE_CODE,
                description: "Attribué à tous les participants de la bêta PoleWin. Vous étiez là avant tout le monde.",
                imageUrl:    "/badges/pionnier-du-paddock.png",
                rarity:      "legendary",
                now,
            },
        },
    );

    // No automated rule — awarded manually by an admin to all beta users
    void result;
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.sequelize.query(
        `DELETE FROM badges WHERE code = :code`,
        { replacements: { code: BADGE_CODE } },
    );
}