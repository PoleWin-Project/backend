/**
 * Outils des tests d'intégration DB (cf. jest.db.config.js).
 * ⚠️ resetDb() VIDE les tables : n'est utilisable que sur une base `*_test`
 * (garanti par setup.db.js).
 */
import { sequelize } from "../../database/sequelize";
import { migrator } from "../../database/migrator";
import {
    initModels,
    PredictionModel,
    ProfileModel,
    RaceSessionModel,
    SeasonModel,
    UserModel,
} from "../../database/models";

let initialized = false;

export async function setupDb() {
    if (!initialized) {
        initModels(sequelize);
        initialized = true;
    }
    await migrator.up();
}

export async function resetDb() {
    await sequelize.query(`
        TRUNCATE championship_score_events, season_scores, season_final_standings,
                 garage_transactions, garage_wallets, prediction_reward_options,
                 pronostics_details, pronostics, predictions, race_sessions, seasons,
                 game_plays, user_badges, league_members, leagues, profiles, users
        RESTART IDENTITY CASCADE
    `);
}

export async function createUser(username: string, opts: { role?: string; points?: number } = {}) {
    const user = await UserModel.create({
        email: `${username}@example.test`,
        username,
        passwordHash: "not-a-real-hash",
        role: opts.role ?? "user",
        lastLoginAt: null,
    } as any);
    await ProfileModel.create({ userId: user.id, displayName: username, points: opts.points ?? 500 } as any);
    return user;
}

export async function createActiveSeason(code = "2026") {
    return SeasonModel.create({
        code,
        name: `Saison ${code}`,
        status: "active",
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: null,
        archivedAt: null,
    });
}

/** Session future avec une prédiction ouverte du type demandé. */
export async function createOpenPrediction(type = "RACE_WINNER") {
    const start = new Date(Date.now() + 3 * 86_400_000);
    const session = await RaceSessionModel.create({
        idCourseExternal: 9999,
        name: "Test GP - Race",
        type: "Race",
        location: "Test",
        dateStart: start,
    } as any);
    const prediction = await PredictionModel.create({ sessionId: session.id, type, closesAt: start } as any);
    return { session, prediction };
}

/** Classement pilotes simulé (évite tout appel réseau). */
export const FAKE_STANDINGS = [
    { position: 1,  driver: { name_acronym: "VER" } },
    { position: 2,  driver: { name_acronym: "NOR" } },
    { position: 3,  driver: { name_acronym: "HAM" } },
    { position: 7,  driver: { name_acronym: "ALO" } },
    { position: 18, driver: { name_acronym: "STR" } },
];

export async function closeDb() {
    await sequelize.close();
}
