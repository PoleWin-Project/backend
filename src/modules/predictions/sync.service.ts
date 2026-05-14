import { OpenF1Service } from "../openf1/openf1.service";
import { RaceSessionModel, PredictionModel } from "../../database/models";
import { sequelize } from "../../database/sequelize";
import { logger } from "../../config/logger";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class SyncService {
    constructor(private readonly openf1 = new OpenF1Service()) {}

    async syncSeason(year: number) {
        logger.info(`Starting F1 season sync for ${year}...`);
        const meetings = await this.openf1.getCalendar(year);
        
        let sessionsCreated = 0;
        let predictionsCreated = 0;

        for (const meeting of meetings) {
            await sleep(200); // Small gap between meetings
            const sessions = await this.openf1.getSessions({ meeting_key: meeting.meeting_key });
            await sleep(100); // Small gap after sessions fetch
            
            for (const s of sessions) {
                const name = s.session_name.toLowerCase().trim();
                // "Qualifying" only (not "Sprint Qualifying" / "Sprint Shootout")
                const isQualifying = name === "qualifying";
                // "Race" only
                const isRace = name === "race";
                // "Sprint" only (the sprint race itself, not the sprint qualifying)
                const isSprint = name === "sprint";

                if (!isQualifying && !isRace && !isSprint) continue;

                let predictionType: "POLE_POSITION" | "RACE_WINNER" | "SPRINT_WINNER";
                if (isQualifying) predictionType = "POLE_POSITION";
                else if (isRace) predictionType = "RACE_WINNER";
                else predictionType = "SPRINT_WINNER";

                await sequelize.transaction(async (tx) => {
                    const [session, created] = await RaceSessionModel.findOrCreate({
                        where: { idCourseExternal: s.session_key },
                        defaults: {
                            idCourseExternal: s.session_key,
                            name: `${meeting.meeting_name} - ${s.session_name}`,
                            type: s.session_name,
                            dateStart: new Date(s.date_start),
                        },
                        transaction: tx,
                    });

                    if (created) sessionsCreated++;

                    const [, pCreated] = await PredictionModel.findOrCreate({
                        where: { sessionId: session.id, type: predictionType },
                        defaults: {
                            sessionId: session.id,
                            type: predictionType,
                            closesAt: session.dateStart,
                        },
                        transaction: tx,
                    });
                    if (pCreated) predictionsCreated++;
                });
            }
        }

        logger.info(`Sync complete. Created ${sessionsCreated} sessions and ${predictionsCreated} predictions.`);
        return { sessionsCreated, predictionsCreated };
    }
}
