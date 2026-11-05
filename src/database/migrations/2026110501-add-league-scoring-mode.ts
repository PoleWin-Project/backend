import { DataTypes, QueryInterface } from "sequelize";

/** Ajoute le choix de classement privé sans modifier les Écuries existantes. */
export async function up({ context: q }: { context: QueryInterface }) {
    await q.sequelize.transaction(async transaction => {
        await q.addColumn("leagues", "scoring_mode", {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "season",
        }, { transaction });
        await q.addConstraint("leagues", {
            fields: ["scoring_mode"],
            type: "check",
            name: "leagues_scoring_mode_check",
            where: { scoring_mode: ["season", "from_join"] },
            transaction,
        });
        await q.addColumn("league_members", "points_baseline", {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        }, { transaction });
    });
}

export async function down({ context: q }: { context: QueryInterface }) {
    await q.sequelize.transaction(async transaction => {
        await q.removeColumn("league_members", "points_baseline", { transaction });
        await q.removeConstraint("leagues", "leagues_scoring_mode_check", { transaction });
        await q.removeColumn("leagues", "scoring_mode", { transaction });
    });
}
