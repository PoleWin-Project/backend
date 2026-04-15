import { openf1Client } from "../src/common/clients/openf1.client";
import { logger } from "../src/config/logger";

async function test() {
    try {
        console.log("Testing OpenF1 connection...");
        const result = await openf1Client.get("/meetings", { year: 2024 }) as any[];
        console.log("Success! Found " + result.length + " meetings.");
    } catch (e: any) {
        console.error("Error calling OpenF1:");
        console.error(e.message);
        if (e.stack) console.error(e.stack);
    }
}

test();
