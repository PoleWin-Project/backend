import { QueryInterface } from "sequelize";

// Consolidate the duplicate badge without losing existing beta recognition.
export async function up({ context: q }: { context: QueryInterface }) {
    await q.sequelize.transaction(async transaction => {
        await q.sequelize.query(`
            CREATE TABLE migration_founder_badge_backup AS SELECT * FROM badges WHERE code = 'pilote_fondateur';
            CREATE TABLE migration_founder_awards_backup AS
              SELECT ub.*, EXISTS (SELECT 1 FROM user_badges pb JOIN badges b ON b.id = pb.badge_id
                WHERE pb.user_id = ub.user_id AND b.code = 'pionnier_du_paddock') AS had_pioneer
              FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE b.code = 'pilote_fondateur';
            INSERT INTO user_badges (user_id, badge_id, awarded_at)
              SELECT ub.user_id, b.id, ub.awarded_at FROM migration_founder_awards_backup ub
              CROSS JOIN badges b WHERE b.code = 'pionnier_du_paddock'
              ON CONFLICT (user_id, badge_id) DO NOTHING;
            DELETE FROM badges WHERE code = 'pilote_fondateur';
        `, { transaction });
    });
}

export async function down({ context: q }: { context: QueryInterface }) {
    await q.sequelize.transaction(async transaction => {
        await q.sequelize.query(`
            INSERT INTO badges SELECT * FROM migration_founder_badge_backup ON CONFLICT DO NOTHING;
            INSERT INTO user_badges (user_id, badge_id, awarded_at)
              SELECT s.user_id, s.badge_id, s.awarded_at FROM migration_founder_awards_backup s
              JOIN users u ON u.id = s.user_id ON CONFLICT (user_id, badge_id) DO NOTHING;
            DELETE FROM user_badges ub USING badges b, migration_founder_awards_backup s
              WHERE ub.badge_id = b.id AND b.code = 'pionnier_du_paddock'
                AND ub.user_id = s.user_id AND NOT s.had_pioneer AND ub.awarded_at = s.awarded_at;
            DROP TABLE migration_founder_awards_backup;
            DROP TABLE migration_founder_badge_backup;
        `, { transaction });
    });
}
