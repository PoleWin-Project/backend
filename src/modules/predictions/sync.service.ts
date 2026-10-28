import { OpenF1Service } from "../openf1/openf1.service";
import { RaceSessionModel, PredictionModel } from "../../database/models";
import { sequelize } from "../../database/sequelize";
import { logger } from "../../config/logger";

export class SyncService {
    constructor(private readonly openf1 = new OpenF1Service()) {}

    async syncSeason(year: number) {
        const sessions = await this.openf1.getSessions({ year });
        let sessionsCreated = 0;
        let sessionsUpdated = 0;
        let predictionsCreated = 0;

        for (const s of sessions) {
            const name = s.session_name.toLowerCase().trim();
            const predictionType = name === "qualifying" ? "POLE_POSITION"
                : name === "race" ? "RACE_WINNER"
                : name === "sprint" ? "SPRINT_WINNER" : null;

            await sequelize.transaction(async (tx) => {
                const details = {
                    meetingKey: s.meeting_key,
                    name: `${s.country_name} - ${s.session_name}`,
                    type: s.session_name,
                    location: s.location,
                    dateStart: new Date(s.date_start),
                };
                const [session, created] = await RaceSessionModel.findOrCreate({
                    where: { idCourseExternal: s.session_key },
                    defaults: { idCourseExternal: s.session_key, ...details },
                    transaction: tx,
                });
                if (created) sessionsCreated++;
                else {
                    await session.update(details, { transaction: tx });
                    sessionsUpdated++;
                }
                if (!predictionType) return;

                const [prediction, pCreated] = await PredictionModel.findOrCreate({
                    where: { sessionId: session.id, type: predictionType },
                    defaults: { sessionId: session.id, type: predictionType, closesAt: session.dateStart },
                    transaction: tx,
                });
                if (pCreated) predictionsCreated++;
                else if (prediction.resultStatus === "pending" && prediction.closesAt?.getTime() !== session.dateStart?.getTime()) {
                    await prediction.update({ closesAt: session.dateStart }, { transaction: tx });
                }
            });
        }

        logger.info({ year, sessionsCreated, sessionsUpdated, predictionsCreated }, "F1 season synced");
        return { sessionsCreated, sessionsUpdated, predictionsCreated, total: sessions.length };
    }
}
