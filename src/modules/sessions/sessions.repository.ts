import { RaceSessionModel } from "../../database/models";
import { CreateSessionInput, ListSessionsQuery, UpdateSessionInput } from "./sessions.dto";
import { OpenF1Session } from "../openf1/openf1.types";

export class SessionsRepository {
    findAll(query: ListSessionsQuery) {
        const where: any = {};
        if (query.type) where.type = query.type;

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

    async upsertFromOpenF1(sessions: OpenF1Session[]): Promise<{ created: number; updated: number }> {
        let created = 0, updated = 0;
        if (sessions.length > 0) console.log('DEBUG: First session object keys:', Object.keys(sessions[0]), 'Location:', sessions[0].location);
        for (const s of sessions) {
            const defaults = {
                name: `${s.country_name} - ${s.session_name}`,
                type: s.session_type,
                location: s.location,
                dateStart: new Date(s.date_start),
            };
            const [session, wasCreated] = await RaceSessionModel.findOrCreate({
                where: { idCourseExternal: s.session_key },
                defaults: { idCourseExternal: s.session_key, ...defaults },
            });
            if (wasCreated) {
                created++;
            } else {
                await session.update(defaults);
                updated++;
            }
        }
        return { created, updated };
    }
}
