import { QueryInterface } from "sequelize";
import bcrypt from "bcryptjs";

const admins = [
    {
        email:    "Tim_V@outloo.fr",
        username: "FreeZe",
        password: "Admin06&*",
        country:  "France",
        language: "fr",
        display_name: "FreeZe",
    },
    {
        email:    "ibrahim.sako@ynov.com",
        username: "Ibra",
        password: "Ibra2004!",
        display_name: "Ibra",
    },
    {
        email:    "enzo.keil@ynov.com",
        username: "zozo",
        password: "zozo1234!",
        display_name: "zozo",
    },
    {
        email:    "alex.perezab470@gmail.com",
        username: "hallexxx",
        password: "Alex123!",
        display_name: "hallexxx",
    },
];

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    const now = new Date();

    for (const admin of admins) {
        const salt         = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(admin.password, salt);

        const [result] = await queryInterface.sequelize.query(
            `INSERT INTO users (email, username, password_hash, role, is_email_verified, created_at, updated_at)
             VALUES (:email, :username, :passwordHash, 'admin', true, :now, :now)
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            { replacements: { email: admin.email, username: admin.username, passwordHash, now } },
        );

        const rows = result as { id: number }[];
        if (rows.length === 0) continue; // already existed

        await queryInterface.sequelize.query(
            `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
             VALUES (:userId, :displayName, :now, :now)
             ON CONFLICT (user_id) DO NOTHING`,
            { replacements: { userId: rows[0].id, displayName: admin.display_name, now } },
        );
    }
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    const emails = admins.map(a => `'${a.email}'`).join(", ");
    await queryInterface.sequelize.query(
        `DELETE FROM users WHERE email IN (${emails})`,
    );
}
