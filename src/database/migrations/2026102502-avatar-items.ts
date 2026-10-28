import { QueryInterface } from 'sequelize';
export async function up({ context: q }: { context: QueryInterface }) {
    await q.sequelize.transaction(async transaction => {
        await q.sequelize.query(`ALTER TABLE cosmetic_items DROP CONSTRAINT cosmetic_items_kind_check;
            ALTER TABLE cosmetic_items ADD CONSTRAINT cosmetic_items_kind_check CHECK (kind IN ('frame','title','helmet','suit','background'));
            INSERT INTO cosmetic_items (code, kind, name, price, color) VALUES
            ('helmet-antonelli','helmet','Antonelli',300,NULL),
            ('helmet-bortoleto','helmet','Bortoleto',300,NULL),
            ('helmet-hamilton','helmet','Hamilton',300,NULL),
            ('helmet-hulkenberg','helmet','Hulkenberg',300,NULL),
            ('helmet-leclerc','helmet','Leclerc',300,NULL),
            ('helmet-norris','helmet','Norris',300,NULL),
            ('helmet-piastri','helmet','Piastri',300,NULL),
            ('helmet-russell','helmet','Russell',300,NULL),
            ('suit-alpine','suit','Alpine',250,NULL),
            ('suit-aston','suit','Aston Martin',250,NULL),
            ('suit-audi','suit','Audi',250,NULL),
            ('suit-cadillac','suit','Cadillac',250,NULL),
            ('suit-ferrari','suit','Ferrari',250,NULL),
            ('suit-haas','suit','Haas',250,NULL),
            ('suit-mcl','suit','McLaren',250,NULL),
            ('suit-merc','suit','Mercedes',250,NULL),
            ('suit-rb','suit','Racing Bulls',250,NULL),
            ('suit-redbull','suit','Red Bull',250,NULL),
            ('suit-williams','suit','Williams',250,NULL),
            ('background-audi','background','Audi',150,NULL),
            ('background-ferrari','background','Ferrari',150,NULL),
            ('background-mcl','background','McLaren',150,NULL),
            ('background-merc','background','Mercedes',150,NULL);`, { transaction });
    });
}
export async function down({ context: q }: { context: QueryInterface }) {
    // Refuser de supprimer des achats existants lors d'un rollback.
    await q.sequelize.transaction(async transaction => {
        await q.sequelize.query(`DELETE FROM cosmetic_items WHERE kind IN ('helmet','suit','background');
            ALTER TABLE cosmetic_items DROP CONSTRAINT cosmetic_items_kind_check;
            ALTER TABLE cosmetic_items ADD CONSTRAINT cosmetic_items_kind_check CHECK (kind IN ('frame','title'));`, { transaction });
    });
}
