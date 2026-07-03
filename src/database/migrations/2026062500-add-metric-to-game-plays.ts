import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("game_plays", "metric_ms", {
        type: DataTypes.INTEGER,
        allowNull: true,
    });

    // Classement : meilleur (plus petit) temps par jeu
    await queryInterface.addIndex("game_plays", ["game_id", "metric_ms"], {
        name: "game_plays_game_metric_idx",
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeIndex("game_plays", "game_plays_game_metric_idx");
    await queryInterface.removeColumn("game_plays", "metric_ms");
}
