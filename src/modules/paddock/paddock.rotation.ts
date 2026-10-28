import { createHash } from 'crypto';
export type CosmeticKind = 'frame' | 'title' | 'helmet' | 'suit' | 'background';
const WEEK = 7 * 24 * 60 * 60 * 1000;
const EPOCH = Date.UTC(2026, 9, 19); // lundi, minuit UTC
const hash = (key: string) => createHash('sha256').update(key).digest('hex');

/** Sélection déterministe commune aux serveurs, sans tirage à l'achat.
 * Chaque catégorie épuise son catalogue avant le cycle suivant. */
export function weeklySelection<T extends { code: string; kind: CosmeticKind; active: boolean }>(items: T[], now = new Date()) {
    const week = Math.floor((now.getTime() - EPOCH) / WEEK);
    const groups: { kinds: CosmeticKind[]; slots: number }[] = [
        { kinds: ['helmet'], slots: 2 }, { kinds: ['suit'], slots: 2 },
        { kinds: ['background'], slots: 1 }, { kinds: ['frame', 'title'], slots: 1 },
    ];
    const selected: T[] = [];
    for (const group of groups) {
        const pool = items.filter(item => item.active && group.kinds.includes(item.kind));
        if (!pool.length) continue;
        const weeksPerCycle = Math.ceil(pool.length / group.slots);
        const cycle = Math.floor(week / weeksPerCycle);
        const position = ((week % weeksPerCycle) + weeksPerCycle) % weeksPerCycle;
        pool.sort((a, b) => hash(`${cycle}:${a.code}`).localeCompare(hash(`${cycle}:${b.code}`)));
        for (let i = 0; i < Math.min(group.slots, pool.length); i++) {
            selected.push(pool[(position * group.slots + i) % pool.length]);
        }
    }
    selected.sort((a, b) => hash(`${week}:${a.code}`).localeCompare(hash(`${week}:${b.code}`)));
    return { codes: selected.map(item => item.code), startsAt: new Date(EPOCH + week * WEEK).toISOString(),
        refreshesAt: new Date(EPOCH + (week + 1) * WEEK).toISOString() };
}
