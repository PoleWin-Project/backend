import { Client } from "pg";
import { env } from "../config/env";

let dbClient: Client | null = null;

export async function connectToDatabase(): Promise<Client | null> {
    if (!env.databaseUrl) {
        console.warn("DATABASE_URL is not set. Skipping database connection.");
        return null;
    }

    const client = new Client({ connectionString: env.databaseUrl });

    try {
        await client.connect();
        console.log("Connected to PostgreSQL");
        dbClient = client;
        return dbClient;
    } catch (error: any) {
        console.error(
            "Failed to connect to PostgreSQL:",
            error?.message ?? error
        );
        dbClient = null;
        return null;
    }
}

export function getDbClient(): Client | null {
    return dbClient;
}
