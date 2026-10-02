import { Op } from "sequelize";
import { PredictionModel, RaceSessionModel } from "../../database/models";
import { CreateSessionInput, ListSessionsQuery, UpdateSessionInput } from "./sessions.dto";
import { sequelize } from "../../database/sequelize";
import { OpenF1Session } from "../openf1/openf1.types";

export class SessionsRepository {
    findAll(query: ListSessionsQuery) {
        const where: any = {};
        if (query.type) where.type = query.type;
        if (query.upcoming) where.dateStart = { [Op.gte]: new Date() };

        return RaceSessionModel.findAndCountAll({
            where,
            limit: query.limit,
            offset: query.offset,
            order: [["dateStart", "ASC"]],
        });
    }

    findById(id: number) {
        return RaceSessionModel.findByPk(id);
    }

    create(data: CreateSessionInput) {
        return RaceSessionModel.create({
            ...data,
            dateStart: data.dateStart ? new Date(data.dateStart) : undefined,
        } as any);
    }

    async update(id: number, patch: UpdateSessionInput) {
        const session = await RaceSessionModel.findByPk(id);
        if (!session) return null;
        return session.update({
            ...patch,
            dateStart: patch.dateStart ? new Date(patch.dateStart) : undefined,
        } as any);
    }

    async delete(id: number) {
        const session = await RaceSessionModel.findByPk(id);
        if (!session) return false;
        await session.destroy();
        return true;
    }

    async upsertFromOpenF1(sessions: OpenF1Session[]): Promise<{ created: number; updated: number; predictionsCreated: number }> {
        let created = 0, updated = 0, predictionsCreated = 0;
        for (const s of sessions) {
            const defaults = {
                name: `${s.country_name} - ${s.session_name}`,
                type: s.session_name,
                location: s.location,
                dateStart: new Date(s.date_start),
            };
            await sequelize.transaction(async (transaction) => {
                const [session, wasCreated] = await RaceSessionModel.findOrCreate({
                    where: { idCourseExternal: s.session_key },
                    defaults: { idCourseExternal: s.session_key, ...defaults },
                    transaction,
                });
                if (wasCreated) {
                    created++;
                } else {
                    await session.update(defaults, { transaction });
                    updated++;
                }

                // Keep unresolved markets aligned with rescheduled sessions, including
                // sessions whose old date is already in the past. Preserve settled results.
                await PredictionModel.update({ closesAt: defaults.dateStart }, {
                    where: { sessionId: session.id, winningValue: null },
                    transaction,
                });
                const type = ({
                    qualifying: "POLE_POSITION",
                    race: "RACE_WINNER",
                    sprint: "SPRINT_WINNER",
                } as const)[s.session_name.toLowerCase().trim() as "qualifying" | "race" | "sprint"];
                if (type && defaults.dateStart.getTime() > Date.now()) {
                    const [, predictionCreated] = await PredictionModel.findOrCreate({
                        where: { sessionId: session.id, type },
                        defaults: { sessionId: session.id, type, closesAt: defaults.dateStart },
                        transaction,
                    });
                    if (predictionCreated) predictionsCreated++;
                }
            });
        }
        return { created, updated, predictionsCreated };
    }
}
