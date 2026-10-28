import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("predictions", "default_multiplier", {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 2,
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeColumn("predictions", "default_multiplier");
}
