import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.addColumn("race_sessions", "meeting_key", { type: DataTypes.INTEGER, allowNull: true });
    await queryInterface.addIndex("race_sessions", ["meeting_key", "date_start"], { name: "race_sessions_meeting_date_idx" });
    await queryInterface.addColumn("predictions", "winning_value", { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn("predictions", "result_source", { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn("predictions", "result_status", { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" });
    await queryInterface.addColumn("predictions", "resolved_at", { type: DataTypes.DATE, allowNull: true });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.removeColumn("predictions", "resolved_at");
    await queryInterface.removeColumn("predictions", "result_status");
    await queryInterface.removeColumn("predictions", "result_source");
    await queryInterface.removeColumn("predictions", "winning_value");
    await queryInterface.removeIndex("race_sessions", "race_sessions_meeting_date_idx");
    await queryInterface.removeColumn("race_sessions", "meeting_key");
}
