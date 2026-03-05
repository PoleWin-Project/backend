import { RaceSessionModel } from "../../database/models";
import { CreateSessionInput, ListSessionsQuery, UpdateSessionInput } from "./sessions.dto";

export class SessionsRepository {
    findAll(query: ListSessionsQuery) {
        const where: any = {};
        if (query.type) where.type = query.type;

        return RaceSessionModel.findAndCountAll({
            where,
            limit: query.limit,
            offset: query.offset,
            order: [["dateStart", "DESC"]],
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
}
