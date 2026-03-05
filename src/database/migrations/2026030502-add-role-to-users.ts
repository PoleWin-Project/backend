import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("users", "role", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "user",
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeColumn("users", "role");
}
