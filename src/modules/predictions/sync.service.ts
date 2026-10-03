import { OpenF1Service } from "../openf1/openf1.service";
import { SessionsRepository } from "../sessions/sessions.repository";
import { logger } from "../../config/logger";

export class SyncService {
    constructor(private readonly openf1 = new OpenF1Service()) {}

    async syncSeason(year: number) {
        logger.info(`Starting F1 season sync for ${year}...`);
        const sessions = await this.openf1.getSessions({ year });
        const { created, predictionsCreated } = await new SessionsRepository().upsertFromOpenF1(sessions);
        const result = { sessionsCreated: created, predictionsCreated };
        logger.info(result, "F1 season synced");
        return result;
    }
}
