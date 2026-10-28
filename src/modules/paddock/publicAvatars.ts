import { paddockService } from './paddock.service';

/** Enrichit uniquement les identités publiques déjà présentes dans la réponse.
 * Aucun accès à d'autres profils ; une seule lecture pour tous les équipements. */
export async function withPublicAvatars<T>(data: T): Promise<T> {
    if (data == null) return data;
    const plain = JSON.parse(JSON.stringify(data));
    const holders: { id: number; node: Record<string, unknown> }[] = [];
    const visit = (value: unknown) => {
        if (Array.isArray(value)) { value.forEach(visit); return; }
        if (!value || typeof value !== 'object') return;
        const node = value as Record<string, unknown>;
        if (typeof node.id === 'number' && typeof node.username === 'string') {
            holders.push({ id: node.id, node });
        } else if (typeof node.userId === 'number' && typeof node.rank === 'number') {
            holders.push({ id: node.userId, node });
        }
        Object.values(node).forEach(visit);
    };
    visit(plain);
    if (!holders.length) return plain;
    const appearances = await paddockService.appearances(holders.map(holder => holder.id));
    for (const { id, node } of holders) node.cosmetics = appearances.get(id);
    return plain;
}
