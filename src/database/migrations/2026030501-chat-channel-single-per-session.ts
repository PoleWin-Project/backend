import { QueryInterface } from "sequelize";

const INDEX_NAME = "chat_channels_session_id_unique";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.sequelize.query(`
        DELETE FROM chat_channels a
        USING chat_channels b
        WHERE a.session_id = b.session_id
          AND a.id > b.id;
    `);

    await queryInterface.addIndex("chat_channels", ["session_id"], {
        unique: true,
        name: INDEX_NAME,
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeIndex("chat_channels", INDEX_NAME);
}

