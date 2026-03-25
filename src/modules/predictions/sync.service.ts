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
                // Focus on Qualifying and Race sessions for predictions
                const isQualifying = s.session_name.toLowerCase().includes("qualifying") && !s.session_name.toLowerCase().includes("sprint");
                const isRace = s.session_name.toLowerCase() === "race";
                const isSprint = s.session_name.toLowerCase().includes("sprint") && s.session_name.toLowerCase().includes("race");

                if (!isQualifying && !isRace && !isSprint) continue;

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

                    // Create default predictions for this session
                    if (isQualifying) {
                        const [_, pCreated] = await PredictionModel.findOrCreate({
                            where: { sessionId: session.id, type: "POLE_POSITION" },
                            defaults: {
                                sessionId: session.id,
                                type: "POLE_POSITION",
                                closesAt: session.dateStart,
                            },
                            transaction: tx,
                        });
                        if (pCreated) predictionsCreated++;
                    }

                    if (isRace || isSprint) {
                        const types: ("RACE_WINNER" | "FASTEST_LAP" | "PODIUM_FINISH" | "SPRINT_WINNER")[] = 
                            isRace ? ["RACE_WINNER", "FASTEST_LAP", "PODIUM_FINISH"] : ["SPRINT_WINNER"];

                        for (const type of types) {
                            const [_, pCreated] = await PredictionModel.findOrCreate({
                                where: { sessionId: session.id, type },
                                defaults: {
                                    sessionId: session.id,
                                    type,
                                    closesAt: session.dateStart,
                                },
                                transaction: tx,
                            });
                            if (pCreated) predictionsCreated++;
                        }
                    }
                });
            }
        }

        logger.info(`Sync complete. Created ${sessionsCreated} sessions and ${predictionsCreated} predictions.`);
        return { sessionsCreated, predictionsCreated };
    }
}
