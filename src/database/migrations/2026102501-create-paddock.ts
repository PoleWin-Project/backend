import { QueryInterface } from "sequelize";
export async function up({ context: q }: { context: QueryInterface }) {
    await q.sequelize.transaction(async transaction => {
        await q.sequelize.query(`
            CREATE TABLE cosmetic_items (
              code varchar(64) PRIMARY KEY, kind varchar(16) NOT NULL CHECK (kind IN ('frame','title')),
              name varchar(100) NOT NULL, price integer NOT NULL CHECK (price > 0),
              color varchar(7), active boolean NOT NULL DEFAULT true, UNIQUE (code, kind)
            );
            CREATE TABLE user_cosmetics (
              user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              item_code varchar(64) NOT NULL REFERENCES cosmetic_items(code),
              acquired_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, item_code)
            );
            CREATE TABLE equipped_cosmetics (
              user_id integer NOT NULL, kind varchar(16) NOT NULL, item_code varchar(64) NOT NULL,
              PRIMARY KEY (user_id, kind),
              FOREIGN KEY (user_id, item_code) REFERENCES user_cosmetics(user_id, item_code) ON DELETE CASCADE,
              FOREIGN KEY (item_code, kind) REFERENCES cosmetic_items(code, kind)
            );
            INSERT INTO cosmetic_items (code, kind, name, price, color) VALUES
              ('frame-apex','frame','Apex rouge',200,'#E10600'),
              ('frame-night','frame','Course de nuit',350,'#00B4D8'),
              ('frame-gold','frame','Podium doré',500,'#FFD700'),
              ('title-strategist','title','Stratège du muret',200,NULL),
              ('title-late-braker','title','Dernier freineur',300,NULL),
              ('title-pole','title','Chasseur de pole',400,NULL);
        `, { transaction });
    });
}
export async function down({ context: q }: { context: QueryInterface }) {
    await q.sequelize.transaction(async transaction => {
        await q.sequelize.query('DROP TABLE equipped_cosmetics; DROP TABLE user_cosmetics; DROP TABLE cosmetic_items;', { transaction });
    });
}
