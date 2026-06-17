import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("race_sessions", "start_notified_at", {
        type: DataTypes.DATE,
        allowNull: true,
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeColumn("race_sessions", "start_notified_at");
}
