import { DataTypes, QueryInterface } from "sequelize";

/**
 * Migration « no simulated gambling » — badges (DONNÉES, réversible).
 *
 * Plusieurs badges seedés en 2026032501 décrivent l'ancienne mécanique de pari
 * (« Premier Pari », « Miser 100 points… », « Perdre 10 paris… »). Ils sont servis
 * tels quels par GET /badges et affichés dans le profil : ils doivent disparaître de
 * l'interface.
 *  - badges reformulables → nouveau nom / description sans vocabulaire de pari ;
 *  - badges qui n'ont de sens qu'avec une mise → masqués (`is_hidden = true`).
 * Rien n'est supprimé (ni badge, ni attribution) ; les textes d'origine sont
 * sauvegardés dans `migration_badge_texts_backup` et restaurés par `down`.
 *
 * Le badge « Pionnier du Paddock » n'est pas concerné.
 */

const REWORDED: Record<string, { name: string; description: string }> = {
    first_bet:        { name: "Premier Pronostic", description: "Valider son tout premier pronostic" },
    visionnaire:      { name: "Visionnaire", description: "Réussir 3 pronostics consécutifs" },
    millionaire:      { name: "Club des 1000", description: "Atteindre 1000 points de championnat" },
    comeback:         { name: "Retour de Flamme", description: "Réussir un pronostic après 5 pronostics incorrects" },
    drs_open:         { name: "DRS Ouvert", description: "Valider un pronostic dans les 30 secondes suivant l'ouverture d'une session" },
    verstappening:    { name: "Verstappening", description: "Réussir 10 pronostics consécutifs" },
    mur_de_monaco:    { name: "Mur de Monaco", description: "Enchaîner 10 pronostics incorrects sans abandonner" },
    parc_ferme:       { name: "Parc Fermé", description: "Ne jamais modifier un pronostic une fois validé — sur 20 pronostics minimum" },
    minuit_singapour: { name: "Minuit à Singapour", description: "Valider un pronostic entre 23h et 4h du matin" },
    alonso_mode:      { name: "Alonso Mode", description: "Pronostiquer Fernando Alonso vainqueur… et se tromper" },
    dhl_fastest_pit:  { name: "DHL Fastest Pit", description: "Valider un pronostic moins de 5 secondes après l'ouverture d'une session" },
    hammer_time:      { name: "Hammer Time", description: "Pronostiquer Lewis Hamilton vainqueur — et avoir raison" },
};

/** Badges indissociables d'une mise (montant misé, mise perdue, points dépensés…). */
const HIDDEN = ["all_in", "perez_baku_t1", "bernie_ecclestone", "grid_penalty", "cest_les_points"];

const ALL_CODES = [...Object.keys(REWORDED), ...HIDDEN];

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("badges", "is_hidden", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    });

    // Sauvegarde des textes d'origine (pour `down` et l'historique).
    await queryInterface.sequelize.query(
        `CREATE TABLE migration_badge_texts_backup AS
         SELECT code, name, description, now() AS backed_up_at
           FROM badges WHERE code IN (:codes)`,
        { replacements: { codes: ALL_CODES } },
    );

    for (const [code, text] of Object.entries(REWORDED)) {
        await queryInterface.sequelize.query(
            `UPDATE badges SET name = :name, description = :description WHERE code = :code`,
            { replacements: { code, ...text } },
        );
    }
    await queryInterface.sequelize.query(
        `UPDATE badges SET is_hidden = true WHERE code IN (:codes)`,
        { replacements: { codes: HIDDEN } },
    );
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.sequelize.query(`
        UPDATE badges b SET name = s.name, description = s.description
          FROM migration_badge_texts_backup s
         WHERE s.code = b.code
    `);
    await queryInterface.sequelize.query(`DROP TABLE migration_badge_texts_backup`);
    await queryInterface.removeColumn("badges", "is_hidden");
}
