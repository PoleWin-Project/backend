import { migrator } from "./migrator";
import { sequelize } from "./sequelize";

async function main() {
    const cmd = process.argv[2] ?? "up";

    if (cmd === "up") {
        await migrator.up();
        console.log("✅ Migrations appliquées");
    } else if (cmd === "down") {
        await migrator.down({ step: 1 });
        console.log("↩️ Dernière migration annulée");
    } else if (cmd === "status") {
        const executed = await migrator.executed();
        const pending = await migrator.pending();
        console.log(
            "Executed:",
            executed.map((m) => m.name)
        );
        console.log(
            "Pending:",
            pending.map((m) => m.name)
        );
    } else {
        console.log("Usage: up | down | status");
    }

    await sequelize.close();
}

main().catch(async (e) => {
    console.error(e);
    await sequelize.close();
    process.exit(1);
});
