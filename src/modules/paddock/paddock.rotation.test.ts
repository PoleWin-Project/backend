import { weeklySelection, CosmeticKind } from './paddock.rotation';
const items = (['helmet', 'suit', 'background', 'frame', 'title'] as CosmeticKind[]).flatMap((kind, index) =>
    Array.from({ length: [8, 11, 4, 3, 3][index] }, (_, n) => ({ code: `${kind}-${n}`, kind, active: true })));
const week = 7 * 86400000;
const epoch = Date.UTC(2026, 9, 19);
it('propose six articles distincts, avec toutes les catégories d’avatar', () => {
    for (let n = 0; n < 52; n++) {
        const selected = weeklySelection(items, new Date(epoch + n * week));
        expect(new Set(selected.codes).size).toBe(6);
        expect(selected.codes.filter(code => code.startsWith('helmet'))).toHaveLength(2);
        expect(selected.codes.filter(code => code.startsWith('suit'))).toHaveLength(2);
        expect(selected.codes.filter(code => code.startsWith('background'))).toHaveLength(1);
    }
});
it('reste stable dans la semaine et change le lundi à minuit UTC', () => {
    const first = weeklySelection(items, new Date(epoch));
    expect(weeklySelection([...items].reverse(), new Date(epoch + week - 1))).toEqual(first);
    expect(weeklySelection(items, new Date(epoch + week)).codes).not.toEqual(first.codes);
    expect(first.refreshesAt).toBe('2026-10-26T00:00:00.000Z');
});
it('propose tous les articles sur les cycles complets, sans exclure les petits catalogues', () => {
    const seen = new Set<string>();
    for (let n = 0; n < 6; n++) weeklySelection(items, new Date(epoch + n * week)).codes.forEach(code => seen.add(code));
    expect(seen.size).toBe(items.length);
    expect(weeklySelection(items.slice(0, 1), new Date(epoch)).codes).toHaveLength(1);
});
it('ne propose jamais un article désactivé', () => {
    expect(weeklySelection(items.map(item => ({ ...item, active: false }))).codes).toEqual([]);
});
