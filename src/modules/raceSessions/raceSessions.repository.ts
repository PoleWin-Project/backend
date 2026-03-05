import { Op } from "sequelize";
import { RaceSessionModel } from "../../database/models";
import {
    CreateRaceSessionInput,
    ListRaceSessionsQuery,
    UpdateRaceSessionInput,
} from "./raceSessions.dto";

export class RaceSessionsRepository {
    findById(id: number) {
        return RaceSessionModel.findByPk(id);
    }

    findByExternalId(idCourseExternal: number) {
        return RaceSessionModel.findOne({ where: { idCourseExternal } });
    }

    list(query: ListRaceSessionsQuery) {
        const where: any = {};

        if (query.q) {
            where.name = { [Op.iLike]: `%${query.q}%` };
        }

        if (query.type) {
            where.type = { [Op.iLike]: query.type };
        }

        return RaceSessionModel.findAndCountAll({
            where,
            order: [
                ["dateStart", "DESC"],
                ["id", "DESC"],
            ],
            limit: query.limit,
            offset: query.offset,
        });
    }

    create(input: CreateRaceSessionInput) {
        return RaceSessionModel.create(input as any);
    }

    async update(id: number, patch: UpdateRaceSessionInput) {
        const row = await RaceSessionModel.findByPk(id);
        if (!row) return null;
        return row.update(patch);
    }

    async delete(id: number) {
        const row = await RaceSessionModel.findByPk(id);
        if (!row) return false;
        await row.destroy();
        return true;
    }
}

