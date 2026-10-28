import { Op } from "sequelize";
import { httpErrors } from "../../common/errors/http";
import { PredictionModel, RaceSessionModel } from "../../database/models";
import { OpenF1Service } from "../openf1/openf1.service";

export class WeekendsService {
    constructor(private readonly openf1 = new OpenF1Service()) {}

    async next() {
        const session = await RaceSessionModel.findOne({
            where: { meetingKey: { [Op.ne]: null }, dateStart: { [Op.gte]: new Date() } },
            order: [["dateStart", "ASC"]],
        });
        if (!session?.meetingKey) throw httpErrors.notFound("No upcoming Grand Prix");
        return this.get(session.meetingKey);
    }

    async get(meetingKey: number) {
        if (!Number.isSafeInteger(meetingKey) || meetingKey <= 0) throw httpErrors.badRequest("Invalid meeting key");
        const sessions = await RaceSessionModel.findAll({
            where: { meetingKey },
            include: [{ model: PredictionModel, as: "predictions" }],
            order: [["dateStart", "ASC"]],
        });
        if (sessions.length === 0) throw httpErrors.notFound("Grand Prix not found");

        const year = sessions[0].dateStart?.getFullYear() ?? new Date().getFullYear();
        let drivers: { driverNumber: number; code: string; name: string; team: string }[] = [];
        try {
            const seasonSessions = await this.openf1.getSessions({ year });
            const latest = seasonSessions
                .filter((session) => !!session.date_end && Date.parse(session.date_end) < Date.now())
                .sort((a, b) => b.date_start.localeCompare(a.date_start))[0];
            if (latest) {
                const roster = await this.openf1.getDrivers(latest.session_key);
                drivers = roster.map((driver) => ({
                    driverNumber: driver.driver_number,
                    code: driver.name_acronym,
                    name: driver.full_name,
                    team: driver.team_name,
                }));
            }
        } catch {
            // The calendar and questions remain available when the roster provider is unavailable.
        }

        return {
            meetingKey,
            name: sessions[0].name.split(" - ")[0],
            drivers,
            sessions: sessions.map((session) => ({
                id: session.id,
                externalSessionKey: session.idCourseExternal,
                name: session.name,
                type: session.type,
                location: session.location,
                dateStart: session.dateStart,
                predictions: (session.predictions ?? []).map((prediction) => ({
                    id: prediction.id,
                    type: prediction.type,
                    closesAt: prediction.closesAt,
                    isOpen: !!prediction.closesAt && prediction.closesAt > new Date(),
                    resultStatus: prediction.resultStatus,
                    winningValue: prediction.winningValue,
                    resultSource: prediction.resultSource,
                    resolvedAt: prediction.resolvedAt,
                })),
            })),
        };
    }
}
