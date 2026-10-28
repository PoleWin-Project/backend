import { QueryInterface } from 'sequelize';

// Seuls les noms affichés changent. Les codes restent stables pour préserver
// les achats, équipements, illustrations et la sélection hebdomadaire.
const names = [
    ['helmet-antonelli', 'Antonelli', 'Éclair azur'],
    ['helmet-bortoleto', 'Bortoleto', 'Éclat solaire'],
    ['helmet-hamilton', 'Hamilton', 'Orage doré'],
    ['helmet-hulkenberg', 'Hulkenberg', 'Impact néon'],
    ['helmet-leclerc', 'Leclerc', 'Apex écarlate'],
    ['helmet-norris', 'Norris', 'Flash acide'],
    ['helmet-piastri', 'Piastri', 'Brasier'],
    ['helmet-russell', 'Russell', 'Sillage bleu'],
    ['suit-alpine', 'Alpine', 'Horizon rose'],
    ['suit-aston', 'Aston Martin', 'Virage émeraude'],
    ['suit-audi', 'Audi', 'Carbone'],
    ['suit-cadillac', 'Cadillac', 'Minuit'],
    ['suit-ferrari', 'Ferrari', 'Rouge course'],
    ['suit-haas', 'Haas', 'Contraste'],
    ['suit-mcl', 'McLaren', 'Ligne orange'],
    ['suit-merc', 'Mercedes', 'Onde turquoise'],
    ['suit-rb', 'Racing Bulls', 'Bleu électrique'],
    ['suit-redbull', 'Red Bull', 'Nuit de course'],
    ['suit-williams', 'Williams', 'Bleu vitesse'],
    ['background-audi', 'Audi', 'Halo nocturne'],
    ['background-ferrari', 'Ferrari', 'Zone rouge'],
    ['background-mcl', 'McLaren', 'Lueur orange'],
    ['background-merc', 'Mercedes', 'Néon turquoise'],
] as const;

async function rename(q: QueryInterface, direction: 'up' | 'down') {
    await q.sequelize.transaction(async transaction => {
        for (const [code, previous, next] of names) {
            await q.sequelize.query(
                'UPDATE cosmetic_items SET name = :name WHERE code = :code',
                { replacements: { code, name: direction === 'up' ? next : previous }, transaction },
            );
        }
    });
}

export async function up({ context }: { context: QueryInterface }) {
    await rename(context, 'up');
}
export async function down({ context }: { context: QueryInterface }) {
    await rename(context, 'down');
}
