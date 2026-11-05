import { DataTypes, QueryInterface } from "sequelize";

/**
 * Les anciennes Écuries pouvaient exister sans code, car la table avait été
 * préparée avant l'arrivée de l'écran de gestion. On leur attribue un code
 * stable et unique avant de rendre la colonne obligatoire.
 */
export async function up({ context: q }: { context: QueryInterface }) {
    await q.sequelize.transaction(async transaction => {
        await q.sequelize.query(`
            UPDATE leagues
               SET invite_code = 'PW' || UPPER(TO_HEX(id)) || UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 4))
             WHERE invite_code IS NULL OR BTRIM(invite_code) = ''
        `, { transaction });

        // Une ancienne Écurie reste toujours accessible à son propriétaire.
        await q.sequelize.query(`
            INSERT INTO league_members (league_id, user_id, joined_at)
            SELECT id, owner_user_id, created_at
              FROM leagues
            ON CONFLICT (league_id, user_id) DO NOTHING
        `, { transaction });

        await q.changeColumn("leagues", "invite_code", {
            type: DataTypes.STRING,
            allowNull: false,
        }, { transaction });
    });
}

export async function down({ context: q }: { context: QueryInterface }) {
    await q.changeColumn("leagues", "invite_code", {
        type: DataTypes.STRING,
        allowNull: true,
    });
}
