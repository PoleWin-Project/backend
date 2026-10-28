import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { isChampionshipMode } from "../../config/env";
import { httpErrors } from "../../common/errors/http";
import { garageService } from "../garage/garage.service";

import { weeklySelection, CosmeticKind } from "./paddock.rotation";

type Item = { code: string; kind: CosmeticKind; active: boolean; name: string; price: number; color: string | null; owned: boolean; equipped: boolean };
export class PaddockService {
    async appearances(userIds: number[]) {
        const ids = [...new Set(userIds)];
        const rows = ids.length ? await sequelize.query<Item & { userId: number }>(`SELECT i.*, e.user_id AS "userId" FROM equipped_cosmetics e
            JOIN cosmetic_items i ON i.code = e.item_code WHERE e.user_id IN (:ids)`,
            { replacements: { ids }, type: QueryTypes.SELECT }) : [];
        const grouped = new Map<number, Item[]>();
        for (const row of rows) {
            const list = grouped.get(row.userId) ?? [];
            list.push(row);
            grouped.set(row.userId, list);
        }
        return new Map(ids.map(userId => {
            const equipment = grouped.get(userId) ?? [];
            const find = (kind: CosmeticKind) => {
                const item = equipment.find(i => i.kind === kind);
                return item ? { code: item.code, name: item.name, color: item.color } : null;
            };
            return [userId, { frame: find('frame'), title: find('title'), helmet: find('helmet'), suit: find('suit'), background: find('background') }];
        }));
    }
    async appearance(userId: number) {
        return (await this.appearances([userId])).get(userId)!;
    }
    async catalog(userId: number) {
        const [items, garageCredits, cosmetics] = await Promise.all([
            sequelize.query<Item>(`SELECT i.*, (u.item_code IS NOT NULL) AS owned, (e.item_code IS NOT NULL) AS equipped
                FROM cosmetic_items i LEFT JOIN user_cosmetics u ON u.item_code = i.code AND u.user_id = :userId
                LEFT JOIN equipped_cosmetics e ON e.item_code = i.code AND e.user_id = :userId
                WHERE i.active OR u.item_code IS NOT NULL ORDER BY i.kind, i.price, i.code`,
                { replacements: { userId }, type: QueryTypes.SELECT }),
            garageService.getBalance(userId), this.appearance(userId),
        ]);
        const rotation = weeklySelection(items);
        const available = new Set(rotation.codes);
        const visible = items.filter(item => available.has(item.code) || item.owned)
            .map(item => ({ ...item, available: available.has(item.code) }));
        visible.sort((a, b) => rotation.codes.indexOf(a.code) - rotation.codes.indexOf(b.code));
        return { enabled: isChampionshipMode(), items: visible, garageCredits, cosmetics, rotation };
    }
    private async lock(userId: number, transaction: Transaction) {
        await sequelize.query('SELECT id FROM users WHERE id = :userId FOR UPDATE', { replacements: { userId }, transaction });
    }
    async purchase(userId: number, code: string) {
        if (!isChampionshipMode()) throw httpErrors.conflict('Le Paddock ouvre au lancement du championnat.');
        return sequelize.transaction(async transaction => {
            await this.lock(userId, transaction);
            const [item] = await sequelize.query<Item>('SELECT * FROM cosmetic_items WHERE code = :code AND active',
                { replacements: { code }, transaction, type: QueryTypes.SELECT });
            if (!item) throw httpErrors.notFound('Personnalisation introuvable');
            const owned = await sequelize.query('SELECT 1 FROM user_cosmetics WHERE user_id = :userId AND item_code = :code',
                { replacements: { userId, code }, transaction, type: QueryTypes.SELECT });
            if (owned.length) return { purchased: false, owned: true };
            const catalog = await sequelize.query<Item>('SELECT code, kind, active FROM cosmetic_items WHERE active',
                { transaction, type: QueryTypes.SELECT });
            if (!weeklySelection(catalog).codes.includes(code)) {
                throw httpErrors.conflict('Cet article n’est plus dans la sélection de la semaine. Actualise le Paddock.');
            }
            await garageService.applyMovement({ userId, amount: -item.price, kind: 'cosmetic_purchase',
                idempotencyKey: `cosmetic:${userId}:${code}`, referenceType: 'cosmetic_item', referenceId: code,
                metadata: { name: item.name, price: item.price } }, transaction);
            await sequelize.query('INSERT INTO user_cosmetics (user_id, item_code) VALUES (:userId, :code)',
                { replacements: { userId, code }, transaction });
            return { purchased: true, owned: true };
        });
    }
    async equip(userId: number, kind: CosmeticKind, code: string | null) {
        await sequelize.transaction(async transaction => {
            await this.lock(userId, transaction);
            if (code === null) {
                await sequelize.query('DELETE FROM equipped_cosmetics WHERE user_id = :userId AND kind = :kind',
                    { replacements: { userId, kind }, transaction });
                return;
            }
            const owned = await sequelize.query(`SELECT 1 FROM user_cosmetics u JOIN cosmetic_items i ON i.code = u.item_code
                WHERE u.user_id = :userId AND i.code = :code AND i.kind = :kind`,
                { replacements: { userId, code, kind }, transaction, type: QueryTypes.SELECT });
            if (!owned.length) throw httpErrors.forbidden('Tu dois posséder cette personnalisation pour l’équiper.');
            await sequelize.query(`INSERT INTO equipped_cosmetics (user_id, kind, item_code) VALUES (:userId, :kind, :code)
                ON CONFLICT (user_id, kind) DO UPDATE SET item_code = EXCLUDED.item_code`,
                { replacements: { userId, kind, code }, transaction });
        });
        return this.appearance(userId);
    }
}
export const paddockService = new PaddockService();
