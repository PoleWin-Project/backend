import { QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    // 1. Update the table definition for future users
    // (Note: Sequelize models handle this with defaultValue, but DB level is safer)
    await queryInterface.sequelize.query('ALTER TABLE profiles ALTER COLUMN points SET DEFAULT 500;');

    // 2. Update existing users who have 0 points
    await queryInterface.sequelize.query('UPDATE profiles SET points = 500 WHERE points = 0;');
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.sequelize.query('ALTER TABLE profiles ALTER COLUMN points SET DEFAULT 0;');
    // We don't revert points for users as that would be destructive if they earned them.
}
