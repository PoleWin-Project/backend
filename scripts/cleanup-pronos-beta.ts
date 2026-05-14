import "dotenv/config";
import { Op } from "sequelize";
import { sequelize } from "../src/database/sequelize";
import { initModels } from "../src/database/models/initModels";
import {
    PredictionModel,
    PronosticModel,
    PronosticDetailModel,
    ProfileModel,
    RaceSessionModel,
} from "../src/database/models";

const KEPT_TYPES = ["POLE_POSITION", "RACE_WINNER", "SPRINT_WINNER"];

/**
 * Beta cleanup:
 *  - Stuck pronostics on kept types (awaiting_verification) → refund points,
 *    set status to "void". Kept in history so the user sees what happened.
 *  - Pronostics on removed types → refund points, then delete pronostic
 *    + detail. Predictions of removed types are deleted afterwards.
 */
async function refundIfActive(
    prono: PronosticModel,
    tx: import("sequelize").Transaction,
): Promise<number> {
    const activeStatuses = ["draft", "submitted", "awaiting_verification"];
    if (!activeStatuses.includes(prono.status) || prono.pointsStaked <= 0) return 0;

    const profile = await ProfileModel.findOne({
        where: { userId: prono.userId },
        transaction: tx,
    });
    if (!profile) return 0;

    await profile.update({ points: profile.points + prono.pointsStaked }, { transaction: tx });
    return prono.pointsStaked;
}

async function run() {
    initModels(sequelize);

    const removedPreds = await PredictionModel.findAll({
        where: { type: { [Op.notIn]: KEPT_TYPES } },
    });
    const removedPredIds = removedPreds.map((p) => p.id);
    console.log(`Predictions on removed types: ${removedPreds.length}`);

    let refundedTotal = 0;
    let voidedKept = 0;
    let deletedPronos = 0;

    await sequelize.transaction(async (tx) => {
        // 1. Voider les pronos awaiting_verification sur les types CONSERVÉS
        const keptAwaiting = await PronosticModel.findAll({
            where: {
                status: "awaiting_verification",
                predictionId: removedPredIds.length
                    ? { [Op.notIn]: removedPredIds }
                    : { [Op.gte]: 0 },
            },
            transaction: tx,
        });
        for (const p of keptAwaiting) {
            refundedTotal += await refundIfActive(p, tx);
            await p.update({ status: "void" }, { transaction: tx });
            voidedKept++;
        }

        // 2. Supprimer les pronos sur les types RETIRÉS (avec remboursement)
        if (removedPredIds.length) {
            const toDelete = await PronosticModel.findAll({
                where: { predictionId: { [Op.in]: removedPredIds } },
                transaction: tx,
            });
            for (const p of toDelete) {
                refundedTotal += await refundIfActive(p, tx);
            }
            const ids = toDelete.map((p) => p.id);
            if (ids.length) {
                await PronosticDetailModel.destroy({
                    where: { pronosticId: { [Op.in]: ids } },
                    transaction: tx,
                });
                await PronosticModel.destroy({
                    where: { id: { [Op.in]: ids } },
                    transaction: tx,
                });
                deletedPronos = ids.length;
            }
            await PredictionModel.destroy({
                where: { id: { [Op.in]: removedPredIds } },
                transaction: tx,
            });
        }
    });

    // 3. Normaliser les race_sessions.type : utiliser le suffixe du `name`
    //    (format "{country} - {session_name}") au lieu du session_type générique.
    let sessionsRetyped = 0;
    await sequelize.transaction(async (tx) => {
        const sessions = await RaceSessionModel.findAll({ transaction: tx });
        for (const s of sessions) {
            const parts = s.name.split(" - ");
            const sessionName = parts.length > 1 ? parts[parts.length - 1].trim() : null;
            if (sessionName && sessionName !== s.type) {
                await s.update({ type: sessionName }, { transaction: tx });
                sessionsRetyped++;
            }
        }
    });

    console.log(`Pronos voided (kept types, awaiting_verification): ${voidedKept}`);
    console.log(`Pronos deleted (removed types): ${deletedPronos}`);
    console.log(`Predictions deleted: ${removedPredIds.length}`);
    console.log(`Sessions retyped (type aligned with session_name): ${sessionsRetyped}`);
    console.log(`Points refunded: ${refundedTotal}`);
    process.exit(0);
}

run().catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
});
