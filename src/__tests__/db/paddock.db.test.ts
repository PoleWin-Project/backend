jest.mock("../../modules/push/push.service", () => ({ notifyUser: jest.fn(), broadcastToAll: jest.fn(), PushService: jest.fn() }));
import request from "supertest";
import { createApp } from "../../app";
import { signAccessToken } from "../../common/utils/jwt";
import { env } from "../../config/env";
import { sequelize } from "../../database/sequelize";
import { ProfileModel, GarageTransactionModel, BadgeModel, UserBadgeModel } from "../../database/models";
import * as rotation from "../../modules/paddock/paddock.rotation";
import { QueryTypes } from "sequelize";
import { paddockService } from "../../modules/paddock/paddock.service";
import { garageService } from "../../modules/garage/garage.service";
import { getScoreFields } from "../../modules/championship/scoreSummary";
import * as badgeMigration from "../../database/migrations/2026102500-replace-founder-badge";
import { setupDb, resetDb, closeDb, createUser, createActiveSeason } from "./helpers";

beforeAll(setupDb);
beforeEach(async () => {
    await resetDb(); env.scoringModel = 'championship';
    // Les tests de portefeuille et d’équipement restent indépendants du calendrier.
    jest.spyOn(rotation, 'weeklySelection').mockImplementation(items => ({ codes: items.filter(i => i.active).map(i => i.code), startsAt: '2026-10-19T00:00:00Z', refreshesAt: '2026-10-26T00:00:00Z' }));
});
afterEach(() => jest.restoreAllMocks());
afterAll(closeDb);
async function funded(name: string, amount = 1000) {
    const user = await createUser(name);
    await garageService.applyMovement({ userId: user.id, amount, kind: 'mission', idempotencyKey: `test:${user.id}` });
    return user;
}
it('charges only once under concurrent purchases and keeps championship/legacy points untouched', async () => {
    const user = await funded('buyer');
    const results = await Promise.all(Array.from({ length: 8 }, () => paddockService.purchase(user.id, 'frame-apex')));
    expect(results.filter(r => r.purchased)).toHaveLength(1);
    expect(await garageService.getBalance(user.id)).toBe(800);
    expect(await GarageTransactionModel.count({ where: { kind: 'cosmetic_purchase' } })).toBe(1);
    expect((await paddockService.catalog(user.id)).items.find(i => i.code === 'frame-apex')?.owned).toBe(true);
    expect((await ProfileModel.findOne({ where: { userId: user.id } }))!.points).toBe(500);
    expect((await getScoreFields(user.id, 500)).championshipPoints).toBe(0);
});
it('refuses insufficient funds without creating ownership or a debit', async () => {
    const user = await funded('poor', 100);
    await expect(paddockService.purchase(user.id, 'frame-gold')).rejects.toMatchObject({ statusCode: 422 });
    expect(await garageService.getBalance(user.id)).toBe(100);
    expect((await paddockService.catalog(user.id)).items.some(i => i.owned)).toBe(false);
    expect(await GarageTransactionModel.count({ where: { kind: 'cosmetic_purchase' } })).toBe(0);
});
it('serializes distinct purchases competing for the same balance', async () => {
    const user = await funded('limited', 400);
    const results = await Promise.allSettled(['frame-night', 'frame-apex'].map(code => paddockService.purchase(user.id, code)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await garageService.getBalance(user.id)).toBeGreaterThanOrEqual(0);
});
it('requires ownership and the correct slot; supports replacing and removing equipment', async () => {
    const user = await funded('equip');
    const other = await funded('other');
    await paddockService.purchase(user.id, 'frame-apex');
    await paddockService.purchase(user.id, 'frame-night');
    await paddockService.purchase(user.id, 'title-strategist');
    await expect(paddockService.equip(other.id, 'frame', 'frame-apex')).rejects.toMatchObject({ statusCode: 403 });
    await expect(paddockService.equip(user.id, 'title', 'frame-apex')).rejects.toMatchObject({ statusCode: 403 });
    await paddockService.equip(user.id, 'frame', 'frame-apex');
    await paddockService.equip(user.id, 'frame', 'frame-night');
    await paddockService.equip(user.id, 'title', 'title-strategist');
    expect((await getScoreFields(user.id, 500)).cosmetics).toMatchObject({ frame: { code: 'frame-night' }, title: { code: 'title-strategist' } });
    await paddockService.equip(user.id, 'frame', null);
    expect((await paddockService.appearance(user.id)).frame).toBeNull();
    expect((await paddockService.catalog(user.id)).items.filter(i => i.owned)).toHaveLength(3);
});
it('protects routes, ignores client prices and exposes equipment on public profiles', async () => {
    const user = await funded('http_paddock');
    const app = createApp();
    expect((await request(app).get('/api/v1/paddock')).status).toBe(401);
    const auth = `Bearer ${signAccessToken({ id: user.id, roles: ['user'] })}`;
    const bought = await request(app).post('/api/v1/paddock/purchases').set('Authorization', auth).send({ code: 'frame-gold', price: 1 });
    expect(bought.status).toBe(200);
    expect(await garageService.getBalance(user.id)).toBe(500);
    const equipped = await request(app).put('/api/v1/paddock/equipment').set('Authorization', auth).send({ kind: 'frame', code: 'frame-gold' });
    expect(equipped.status).toBe(200);
    const profile = await request(app).get(`/api/v1/users/${user.id}/public`).set('Authorization', auth);
    expect(profile.status).toBe(200);
    expect(profile.body.cosmetics.frame.code).toBe('frame-gold');
});
it('consolidates founder awards into pioneer without duplicates and supports rollback', async () => {
    const context = sequelize.getQueryInterface();
    await badgeMigration.down({ context });
    const [founder] = await BadgeModel.findOrCreate({ where: { code: 'pilote_fondateur' }, defaults: {
        code: 'pilote_fondateur', name: 'Pilote Fondateur', description: 'Beta', imageUrl: null, rarity: 'legendary',
    } });
    const pioneer = (await BadgeModel.findOne({ where: { code: 'pionnier_du_paddock' } }))!;
    const first = await createUser('first');
    const both = await createUser('both');
    await UserBadgeModel.bulkCreate([
        { userId: first.id, badgeId: founder.id }, { userId: both.id, badgeId: founder.id }, { userId: both.id, badgeId: pioneer.id },
    ]);
    await badgeMigration.up({ context });
    expect(await BadgeModel.count({ where: { code: 'pilote_fondateur' } })).toBe(0);
    expect(await UserBadgeModel.count({ where: { badgeId: pioneer.id } })).toBe(2);
    expect((await getScoreFields(first.id, 500)).isPioneer).toBe(true);
    await badgeMigration.down({ context });
    expect(await UserBadgeModel.count({ where: { badgeId: founder.id } })).toBe(2);
    expect(await UserBadgeModel.count({ where: { badgeId: pioneer.id } })).toBe(1);
    await badgeMigration.up({ context });
});

it('rotates offers server-side while preserving owned equipment outside the weekly shop', async () => {
    jest.restoreAllMocks();
    const user = await funded('weekly', 2000);
    const current = await paddockService.catalog(user.id);
    expect(current.items.filter(i => i.available)).toHaveLength(6);
    const helmet = current.items.find(i => i.kind === 'helmet')!;
    await paddockService.purchase(user.id, helmet.code);
    await paddockService.equip(user.id, 'helmet', helmet.code);
    const [hidden] = await sequelize.query<{ code: string }>(
        'SELECT code FROM cosmetic_items WHERE active AND code NOT IN (:codes) LIMIT 1',
        { replacements: { codes: current.rotation.codes }, type: QueryTypes.SELECT });
    const balance = await garageService.getBalance(user.id);
    await expect(paddockService.purchase(user.id, hidden.code)).rejects.toMatchObject({ statusCode: 409 });
    expect(await garageService.getBalance(user.id)).toBe(balance);
    const select = rotation.weeklySelection;
    const next = new Date(new Date(current.rotation.startsAt).getTime() + 7 * 86400000);
    const pool = await sequelize.query<{ code: string; kind: rotation.CosmeticKind; active: boolean }>('SELECT code, kind, active FROM cosmetic_items', { type: QueryTypes.SELECT });
    while (select(pool, next).codes.includes(helmet.code)) next.setUTCDate(next.getUTCDate() + 7);
    jest.spyOn(rotation, 'weeklySelection').mockImplementation(items => {
        return select(items, next);
    });
    const later = await paddockService.catalog(user.id);
    expect(later.items.find(i => i.code === helmet.code)).toMatchObject({ owned: true, available: false });
    expect((await paddockService.purchase(user.id, helmet.code)).purchased).toBe(false);
    expect(await garageService.getBalance(user.id)).toBe(balance);
    await paddockService.equip(user.id, 'helmet', null);
    await paddockService.equip(user.id, 'helmet', helmet.code);
    expect((await paddockService.appearance(user.id)).helmet?.code).toBe(helmet.code);
});
it('equips helmet, suit and background independently and exposes them publicly', async () => {
    const user = await funded('avatar');
    for (const [kind, code] of [['helmet','helmet-leclerc'], ['suit','suit-merc'], ['background','background-audi']] as const) {
        await paddockService.purchase(user.id, code);
        await paddockService.equip(user.id, kind, code);
    }
    const auth = `Bearer ${signAccessToken({ id: user.id, roles: ['user'] })}`;
    const profile = await request(createApp()).get(`/api/v1/users/${user.id}/public`).set('Authorization', auth);
    expect(profile.body.cosmetics).toMatchObject({ helmet: { code: 'helmet-leclerc' }, suit: { code: 'suit-merc' }, background: { code: 'background-audi' } });
    await paddockService.equip(user.id, 'suit', null);
    expect(await paddockService.appearance(user.id)).toMatchObject({ suit: null, helmet: { code: 'helmet-leclerc' }, background: { code: 'background-audi' } });
});

it('returns equipped avatars for ranked players and a base avatar for unequipped players', async () => {
    await createActiveSeason();
    const first = await funded('ranked_pilot');
    const second = await createUser('base_pilot');
    await paddockService.purchase(first.id, 'helmet-antonelli');
    await paddockService.equip(first.id, 'helmet', 'helmet-antonelli');
    const auth = `Bearer ${signAccessToken({ id: first.id, roles: ['user'] })}`;
    const app = createApp();
    const result = await request(app).get('/api/v1/leaderboard').set('Authorization', auth);
    expect(result.status).toBe(200);
    expect(result.body.items.find((item: any) => item.userId === first.id).cosmetics.helmet.code).toBe('helmet-antonelli');
    expect(result.body.items.find((item: any) => item.userId === second.id).cosmetics).toEqual({ frame: null, title: null, helmet: null, suit: null, background: null });
    const me = await request(app).get('/api/v1/leaderboard/me').set('Authorization', auth);
    expect(me.status).toBe(200);
    expect(me.body.cosmetics.helmet.code).toBe('helmet-antonelli');
});
