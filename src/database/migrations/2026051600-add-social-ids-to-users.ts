import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("users", "google_id", {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    });

    await queryInterface.addColumn("users", "apple_id", {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeColumn("users", "google_id");
    await queryInterface.removeColumn("users", "apple_id");
}
