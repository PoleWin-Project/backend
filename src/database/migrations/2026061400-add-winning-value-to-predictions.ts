import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("predictions", "winning_value", {
        type: DataTypes.STRING,
        allowNull: true,
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeColumn("predictions", "winning_value");
}
