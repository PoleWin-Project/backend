/**
 * Script de test OpenF1 avec retries et fallback.
 *
 * Usage :
 *   ./node_modules/.bin/ts-node scripts/test-openf1.ts
 */

import "dotenv/config";

const BASE_URL  = "https://api.openf1.org/v1";
const TOKEN_URL = "https://api.openf1.org/token";

const USERNAME = process.env.OPENF1_USERNAME;
const PASSWORD = process.env.OPENF1_PASSWORD;

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(label: string, data: unknown) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${label}`);
    console.log(`${"═".repeat(60)}`);
    console.log(JSON.stringify(data, null, 2));
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getToken(): Promise<string | null> {
    if (!USERNAME || !PASSWORD) {
        console.log("⚠️  Pas de credentials → mode gratuit (sans auth)");
        return null;
    }

    console.log(`🔑 Authentification OAuth2 avec ${USERNAME}…`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(TOKEN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username: USERNAME, password: PASSWORD }),
            });

            if (res.ok) {
                const data = await res.json() as { access_token: string; expires_in: string };
                console.log(`✅ Token obtenu ! Expire dans ${data.expires_in}s`);
                return data.access_token;
            }

            if (res.status >= 500) {
                console.log(`⚠️  Serveur error ${res.status} (tentative ${attempt}/${MAX_RETRIES})… retry dans ${RETRY_DELAY_MS / 1000}s`);
                await sleep(RETRY_DELAY_MS);
                continue;
            }

            const body = await res.text();
            throw new Error(`Auth échouée (${res.status}): ${body}`);
        } catch (err: any) {
            if (err.message?.includes("Auth échouée")) throw err;
            if (attempt < MAX_RETRIES) {
                console.log(`⚠️  Erreur réseau (tentative ${attempt}/${MAX_RETRIES})… retry dans ${RETRY_DELAY_MS / 1000}s`);
                await sleep(RETRY_DELAY_MS);
            }
        }
    }

    console.log("⚠️  Auth impossible après retries → fallback mode gratuit (sans token)");
    return null;
}

async function apiGet<T>(path: string, token: string | null, params?: Record<string, string>): Promise<T | null> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(url.toString(), { headers });

            if (res.ok) return res.json() as Promise<T>;

            if (res.status >= 500) {
                console.log(`  ⚠️  ${path} → ${res.status} (tentative ${attempt}/${MAX_RETRIES})… retry dans ${RETRY_DELAY_MS / 1000}s`);
                await sleep(RETRY_DELAY_MS);
                continue;
            }

            if (res.status === 404) {
                console.log(`  ℹ️  ${path} → 404 (pas de données disponibles)`);
                return null;
            }

            const body = await res.text();
            console.log(`  ❌ ${path} → ${res.status}: ${body.slice(0, 200)}`);
            return null;
        } catch (err: any) {
            if (attempt < MAX_RETRIES) {
                console.log(`  ⚠️  ${path} erreur réseau (tentative ${attempt}/${MAX_RETRIES})… retry`);
                await sleep(RETRY_DELAY_MS);
            }
        }
    }

    console.log(`  ❌ ${path} → échec après ${MAX_RETRIES} tentatives`);
    return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🏎️  Test de connexion à l'API OpenF1\n");

    const token = await getToken();

    // 1) Dernière session
    console.log("\n📡 Récupération de la dernière session…");
    const sessions = await apiGet<any[]>("/sessions", token, { session_key: "latest" });

    if (!sessions || sessions.length === 0) {
        console.log("\n⚠️  Aucune session trouvée. L'API est peut-être en maintenance ou hors saison.");
        console.log("    Réessaie dans quelques minutes — OpenF1 peut être instable après les sessions live.");
        return;
    }

    log("DERNIÈRE SESSION", sessions);

    const sessionKey = sessions[0].session_key;
    const sessionName = sessions[0].session_name;
    const meetingName = sessions[0].meeting_name ?? sessions[0].country_name;
    console.log(`\n🏁 Session active : ${meetingName} – ${sessionName} (key: ${sessionKey})`);

    // 2) Positions
    console.log("\n📊 Récupération des positions…");
    const positions = await apiGet<any[]>("/position", token, { session_key: String(sessionKey) });
    if (positions) log(`POSITIONS (${positions.length} entrées, dernières 5)`, positions.slice(-5));

    // 3) Laps
    console.log("\n⏱️  Récupération des tours…");
    const laps = await apiGet<any[]>("/laps", token, { session_key: String(sessionKey) });
    if (laps) log(`TOURS (${laps.length} entrées, derniers 5)`, laps.slice(-5));

    // 4) Race Control
    console.log("\n🚩 Récupération des événements Race Control…");
    const raceControl = await apiGet<any[]>("/race_control", token, { session_key: String(sessionKey) });
    if (raceControl) log(`RACE CONTROL (${raceControl.length} événements, derniers 5)`, raceControl.slice(-5));

    // 5) Intervals
    console.log("\n📏 Récupération des intervalles…");
    const intervals = await apiGet<any[]>("/intervals", token, { session_key: String(sessionKey) });
    if (intervals) log(`INTERVALS (${intervals.length} entrées, derniers 5)`, intervals.slice(-5));

    // 6) Drivers
    console.log("\n👨‍✈️ Récupération des pilotes…");
    const drivers = await apiGet<any[]>("/drivers", token, { session_key: String(sessionKey) });
    if (drivers) {
        log(`PILOTES (${drivers.length})`, drivers.map((d: any) => ({
            number: d.driver_number,
            name: `${d.first_name} ${d.last_name}`,
            team: d.team_name,
        })));
    }

    console.log("\n\n✅ Test terminé ! L'API OpenF1 est accessible.\n");
}

main().catch((err) => {
    console.error("\n💥 ERREUR:", err.message ?? err);
    process.exit(1);
});
