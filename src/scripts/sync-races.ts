import { SyncService } from "../modules/predictions/sync.service";
import { sequelize } from "../database/sequelize";
import { initModels } from "../database/models";

async function main() {
    await sequelize.authenticate();
    initModels(sequelize);
    console.log("Connected to DB, syncing...");

    const service = new SyncService();
    const currentYear = new Date().getFullYear();
    const result = await service.syncSeason(currentYear);
    
    console.log(`Sync completed for year ${currentYear}:`, result);
    process.exit(0);
}
main().catch(console.error);
