import "dotenv/config";
import { SyncService } from "../src/modules/predictions/sync.service";
import { sequelize } from "../src/database/sequelize";
import { initModels } from "../src/database/models/initModels";

async function run() {
    try {
        initModels(sequelize);
        const service = new SyncService();
        const result = await service.syncSeason(2026);
        console.log("Sync Result:", result);
        process.exit(0);
    } catch (e) {
        console.error("Sync Failed:", e);
        process.exit(1);
    }
}

run();
