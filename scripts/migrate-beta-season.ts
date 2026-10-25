/**
 * Bascule « no simulated gambling » : Saison Bêta → championnat sans mise.
 * Cf. MIGRATION_SIMULATED_GAMBLING_PLAN.md (§9, §10, §15) à la racine du monorepo.
 *
 * USAGE (depuis backend/, base LOCALE uniquement par défaut) :
 *   npx ts-node scripts/migrate-beta-season.ts                 # dry-run (défaut) : tout est exécuté
 *                                                              # dans une transaction puis ANNULÉ
 *   npx ts-node scripts/migrate-beta-season.ts --apply         # exécute réellement
 *   npx ts-node scripts/migrate-beta-season.ts --rollback      # annule une bascule appliquée
 *
 * Options :
 *   --season-code=2026 --season-name="Saison 2026"   saison active à ouvrir
 *   --forfait=1000 --bonus-top3=500 --bonus-top10=250 --cap=1500   conversion en crédits Garage
 *   --refund-started     autorise le remboursement de pronostics dont la session a déjà
 *                        commencé (par défaut : refus, il faut d'abord les RÉSOUDRE)
 *   --allow-remote       autorise une base non locale (⚠️ PROD : jamais sans validation)
 *
 * PRÉ-REQUIS avant --apply (fenêtre de maintenance) :
 *   1. PREDICTIONS_FROZEN=true et AUTORESOLVE_ENABLED=false sur le serveur ;
 *   2. pg_dump complet de la base ;
 *   3. pronostics des sessions terminées résolus (route admin /resolve).
 * Après --apply : SCORING_MODEL=championship, puis PREDICTIONS_FROZEN=false.
 *
 * Ce que fait --apply, dans UNE seule transaction :
 *   a. snapshot (tables migration_beta_snapshot_*) de profiles, pronostics, user_badges ;
 *   b. pronostics encore ouverts (anciens paris) → mise remboursée sur profiles.points + statut `void`
 *      (aucune ligne supprimée) ;
 *   c. Saison Bêta (archivée) + classement final figé (RANK sur profiles.points, admins exclus) ;
 *   d. conversion en crédits Garage : forfait + bonus de rang Bêta, plafonné (décision D2 —
 *      basé sur le RANG et non sur le solde, pollué par l'ancienne faille des mini-jeux) ;
 *   e. badge « Pionnier du Paddock » pour tous les inscrits avant la bascule ;
 *   f. ouverture de la nouvelle saison active, tous les joueurs à 0 point.
 * `profiles.points` n'est JAMAIS remis à zéro : il reste l'archive brute de la Saison Bêta.
 */
import "dotenv/config";
import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../src/database/sequelize";

// ── Paramètres ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, def: string) => {
    const a = args.find((x) => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : def;
};

const MODE: "dry-run" | "apply" | "rollback" = flag("rollback") ? "rollback" : flag("apply") ? "apply" : "dry-run";
const PARAMS = {
    seasonCode: opt("season-code", String(new Date().getFullYear())),
    seasonName: opt("season-name", `Saison ${new Date().getFullYear()}`),
    forfait:    Number(opt("forfait", "1000")),
    bonusTop3:  Number(opt("bonus-top3", "500")),
    bonusTop10: Number(opt("bonus-top10", "250")),
    cap:        Number(opt("cap", "1500")),
    refundStarted: flag("refund-started"),
};

const BETA_CODE = "beta";
const PIONEER_BADGE = "pionnier_du_paddock";
const SNAPSHOT_TABLES = [
    "migration_beta_snapshot_profiles",
    "migration_beta_snapshot_pronostics",
    "migration_beta_snapshot_user_badges",
];

/** Exception dédiée au dry-run : provoque le ROLLBACK de la transaction après le rapport. */
class DryRunRollback extends Error {}

// ── Garde-fous ───────────────────────────────────────────────────────────────

function assertLocalDatabase() {
    const url = process.env.DATABASE_URL ?? "";
    let host = "";
    try { host = new URL(url).hostname; } catch { /* URL invalide */ }
    const isLocal = ["localhost", "127.0.0.1", "postgres-db"].includes(host);
    if (!isLocal && !flag("allow-remote")) {
        console.error(`⛔ Base non locale détectée (${host || "URL invalide"}). Ajoute --allow-remote UNIQUEMENT si c'est voulu.`);
        process.exit(1);
    }
    console.log(`Base cible : ${host} — mode : ${MODE.toUpperCase()}`);
}

async function q<T = any>(sql: string, tx: Transaction, replacements: Record<string, unknown> = {}): Promise<T[]> {
    return (await sequelize.query(sql, { replacements, transaction: tx, type: QueryTypes.SELECT })) as T[];
}
async function exec(sql: string, tx: Transaction, replacements: Record<string, unknown> = {}) {
    await sequelize.query(sql, { replacements, transaction: tx });
}

// ── APPLY ────────────────────────────────────────────────────────────────────

async function apply(tx: Transaction) {
    const cutoverAt = new Date();
    const report: Record<string, unknown> = { cutoverAt: cutoverAt.toISOString(), params: PARAMS };

    // 0. Pré-conditions
    const [{ exists: already }] = await q<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM seasons WHERE code = :code) AS exists`, tx, { code: BETA_CODE });
    if (already) throw new Error("La Saison Bêta existe déjà : bascule déjà appliquée (utiliser --rollback d'abord).");
    for (const t of SNAPSHOT_TABLES) {
        const [{ reg }] = await q<{ reg: string | null }>(`SELECT to_regclass(:t)::text AS reg`, tx, { t });
        if (reg) throw new Error(`La table ${t} existe déjà : nettoyer une bascule précédente avant de recommencer.`);
    }
    const [{ id: pioneerBadgeId } = { id: null }] = await q<{ id: number }>(
        `SELECT id FROM badges WHERE code = :code`, tx, { code: PIONEER_BADGE });
    if (!pioneerBadgeId) throw new Error("Badge pionnier_du_paddock introuvable : lancer les migrations (npm run migrate).");

    // Verrou global : aucune autre écriture de score pendant la bascule.
    await exec(`LOCK TABLE profiles, pronostics IN SHARE ROW EXCLUSIVE MODE`, tx);

    const before = (await q(`
        SELECT (SELECT COUNT(*) FROM users)::int                       AS users,
               (SELECT COUNT(*) FROM pronostics)::int                  AS pronostics,
               (SELECT COALESCE(SUM(points), 0) FROM profiles)::int    AS "sumProfilePoints"`, tx))[0];
    report.before = before;

    // a. Snapshots
    await exec(`CREATE TABLE migration_beta_snapshot_profiles AS
                SELECT *, :at::timestamptz AS snapshot_at FROM profiles`, tx, { at: cutoverAt });
    await exec(`CREATE TABLE migration_beta_snapshot_pronostics AS
                SELECT p.*, d.value AS detail_value, d.multiplier AS detail_multiplier, :at::timestamptz AS snapshot_at
                  FROM pronostics p LEFT JOIN pronostics_details d ON d.pronostic_id = p.id`, tx, { at: cutoverAt });
    await exec(`CREATE TABLE migration_beta_snapshot_user_badges AS
                SELECT *, :at::timestamptz AS snapshot_at FROM user_badges`, tx, { at: cutoverAt });
    await exec(`CREATE TABLE migration_beta_cutover (
                    cutover_at timestamptz NOT NULL, new_season_code varchar(32) NOT NULL,
                    params jsonb NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`, tx);
    await exec(`INSERT INTO migration_beta_cutover (cutover_at, new_season_code, params)
                VALUES (:at, :code, :params::jsonb)`, tx,
        { at: cutoverAt, code: PARAMS.seasonCode, params: JSON.stringify(PARAMS) });

    // b. Pronostics encore ouverts (anciens paris)
    const open = await q<{ id: number; user_id: number; points_staked: number; started: boolean }>(`
        SELECT p.id, p.user_id, p.points_staked,
               (pred.closes_at IS NOT NULL AND pred.closes_at <= now()) AS started
          FROM pronostics p JOIN predictions pred ON pred.id = p.prediction_id
         WHERE p.status IN ('draft', 'submitted', 'awaiting_verification')
         FOR UPDATE OF p`, tx);
    const started = open.filter((p) => p.started);
    if (started.length && !PARAMS.refundStarted) {
        throw new Error(
            `${started.length} pronostic(s) ouvert(s) sur des sessions déjà commencées (ids ${started.map((p) => p.id).join(", ")}). ` +
            `Les résoudre d'abord (route admin /resolve), ou relancer avec --refund-started.`,
        );
    }
    const refundTotal = open.reduce((s, p) => s + p.points_staked, 0);
    await exec(`
        UPDATE profiles pr SET points = pr.points + r.total, updated_at = now()
          FROM (SELECT user_id, SUM(points_staked) AS total FROM pronostics
                 WHERE status IN ('draft', 'submitted', 'awaiting_verification') GROUP BY user_id) r
         WHERE r.user_id = pr.user_id`, tx);
    await exec(`UPDATE pronostics SET status = 'void', resolved_at = :at
                 WHERE status IN ('draft', 'submitted', 'awaiting_verification')`, tx, { at: cutoverAt });
    report.openPronostics = { voided: open.length, startedSessions: started.length, refundedPoints: refundTotal };

    // c. Saison Bêta + classement final figé
    const [{ min_created }] = await q<{ min_created: Date }>(`SELECT MIN(created_at) AS min_created FROM users`, tx);
    const [{ id: betaId }] = await q<{ id: number }>(`
        INSERT INTO seasons (code, name, status, starts_at, ends_at, archived_at)
        VALUES (:code, 'Saison Bêta', 'archived', :start, :at, :at) RETURNING id`, tx,
        { code: BETA_CODE, start: min_created ?? cutoverAt, at: cutoverAt });
    await exec(`
        INSERT INTO season_final_standings (season_id, user_id, final_rank, final_score, participants, stats, archived_at)
        SELECT :betaId, p.user_id,
               RANK() OVER (ORDER BY p.points DESC),          -- égalité = même rang
               p.points,
               COUNT(*) OVER (),
               jsonb_build_object(
                   'correct',   COALESCE(st.won, 0),
                   'incorrect', COALESCE(st.lost, 0),
                   'resolved',  COALESCE(st.won, 0) + COALESCE(st.lost, 0)),
               :at
          FROM profiles p
          JOIN users u ON u.id = p.user_id
          LEFT JOIN (SELECT user_id,
                            COUNT(*) FILTER (WHERE status = 'won')  AS won,
                            COUNT(*) FILTER (WHERE status = 'lost') AS lost
                       FROM pronostics GROUP BY user_id) st ON st.user_id = p.user_id
         WHERE u.role <> 'admin'                                -- admins exclus (décision D7)
           AND u.created_at < :at`, tx, { betaId, at: cutoverAt });

    // d. Conversion en crédits Garage (idempotency_key = beta_conversion:<userId>)
    await exec(`INSERT INTO garage_wallets (user_id) SELECT id FROM users ON CONFLICT (user_id) DO NOTHING`, tx);
    await exec(`
        INSERT INTO garage_transactions
            (user_id, amount, kind, reference_type, reference_id, idempotency_key, balance_after, metadata, created_at)
        SELECT c.user_id, c.credits, 'beta_conversion', 'season', 'beta',
               'beta_conversion:' || c.user_id,
               w.balance + c.credits,
               jsonb_build_object('betaRank', c.final_rank, 'legacyPoints', c.legacy_points),
               :at
          FROM (SELECT u.id AS user_id, f.final_rank, pr.points AS legacy_points,
                       LEAST(:forfait + CASE WHEN f.final_rank <= 3  THEN :bonusTop3
                                             WHEN f.final_rank <= 10 THEN :bonusTop10
                                             ELSE 0 END, :cap) AS credits
                  FROM users u
                  JOIN profiles pr ON pr.user_id = u.id
                  LEFT JOIN season_final_standings f ON f.user_id = u.id AND f.season_id = :betaId
                 WHERE u.created_at < :at) c
          JOIN garage_wallets w ON w.user_id = c.user_id
         WHERE c.credits > 0
        ON CONFLICT (idempotency_key) DO NOTHING`, tx,
        { at: cutoverAt, betaId, forfait: PARAMS.forfait, bonusTop3: PARAMS.bonusTop3, bonusTop10: PARAMS.bonusTop10, cap: PARAMS.cap });
    await exec(`
        UPDATE garage_wallets w SET balance = t.balance_after, updated_at = now()
          FROM garage_transactions t
         WHERE t.user_id = w.user_id AND t.idempotency_key = 'beta_conversion:' || w.user_id`, tx);

    // e. Badge Pionnier du Paddock
    await exec(`
        INSERT INTO user_badges (user_id, badge_id, awarded_at)
        SELECT u.id, :badgeId, :at FROM users u WHERE u.created_at < :at
        ON CONFLICT (user_id, badge_id) DO NOTHING`, tx, { badgeId: pioneerBadgeId, at: cutoverAt });

    // f. Nouvelle saison active, tout le monde à 0
    const [{ id: seasonId }] = await q<{ id: number }>(`
        INSERT INTO seasons (code, name, status, starts_at) VALUES (:code, :name, 'active', :at) RETURNING id`, tx,
        { code: PARAMS.seasonCode, name: PARAMS.seasonName, at: cutoverAt });
    await exec(`INSERT INTO season_scores (season_id, user_id) SELECT :seasonId, id FROM users
                ON CONFLICT DO NOTHING`, tx, { seasonId });

    // Contrôles (plan §15.4) — toute incohérence annule la transaction.
    const after = (await q(`
        SELECT (SELECT COUNT(*) FROM users)::int                                                     AS users,
               (SELECT COUNT(*) FROM pronostics)::int                                                AS pronostics,
               (SELECT COUNT(*) FROM pronostics WHERE status IN ('draft','submitted','awaiting_verification'))::int AS "openPronostics",
               (SELECT COALESCE(SUM(points), 0) FROM profiles)::int                                  AS "sumProfilePoints",
               (SELECT COUNT(*) FROM season_final_standings WHERE season_id = :betaId)::int          AS "betaStandings",
               (SELECT COALESCE(SUM(balance), 0) FROM garage_wallets)::int                           AS "sumGarageWallets",
               (SELECT COALESCE(SUM(amount), 0) FROM garage_transactions)::int                       AS "sumGarageLedger",
               (SELECT COUNT(*) FROM user_badges WHERE badge_id = :badgeId)::int                     AS "pioneers",
               (SELECT COALESCE(SUM(points), 0) FROM season_scores WHERE season_id = :seasonId)::int AS "newSeasonPoints"`,
        tx, { betaId, badgeId: pioneerBadgeId, seasonId }))[0];
    report.after = after;

    const checks: [string, boolean][] = [
        ["users inchangés",                          after.users === before.users],
        ["aucun pronostic supprimé",                 after.pronostics === before.pronostics],
        ["plus aucun pronostic ouvert",              after.openPronostics === 0],
        ["Σ profiles.points = avant + remboursements", after.sumProfilePoints === before.sumProfilePoints + refundTotal],
        ["wallets Garage = ledger",                  after.sumGarageWallets === after.sumGarageLedger],
        ["nouvelle saison à 0",                      after.newSeasonPoints === 0],
    ];
    report.checks = Object.fromEntries(checks);
    const failed = checks.filter(([, ok]) => !ok);
    if (failed.length) throw new Error(`Contrôles en échec : ${failed.map(([n]) => n).join(", ")}`);

    return report;
}

// ── ROLLBACK ─────────────────────────────────────────────────────────────────

async function rollback(tx: Transaction) {
    const [log] = await q<{ cutover_at: Date; new_season_code: string }>(
        `SELECT cutover_at, new_season_code FROM migration_beta_cutover ORDER BY applied_at DESC LIMIT 1`, tx);
    if (!log) throw new Error("Aucune bascule enregistrée (table migration_beta_cutover vide).");
    const at = log.cutover_at;

    const [{ count: scoredEvents }] = await q<{ count: number }>(`
        SELECT COUNT(*)::int AS count FROM championship_score_events e
          JOIN seasons s ON s.id = e.season_id WHERE s.code = :code`, tx, { code: log.new_season_code });
    if (scoredEvents > 0) {
        throw new Error(`${scoredEvents} événement(s) de score déjà enregistrés dans la nouvelle saison : rollback automatique refusé.`);
    }

    // Soldes legacy et statuts des pronostics remis à l'identique du snapshot.
    await exec(`UPDATE profiles p SET points = s.points FROM migration_beta_snapshot_profiles s WHERE s.id = p.id`, tx);
    await exec(`UPDATE pronostics p SET status = s.status, resolved_at = s.resolved_at
                  FROM migration_beta_snapshot_pronostics s
                 WHERE s.id = p.id AND p.status = 'void' AND p.resolved_at = :at`, tx, { at });

    // Crédits de conversion retirés ; solde recalculé depuis le ledger restant.
    await exec(`DELETE FROM garage_transactions WHERE kind = 'beta_conversion'`, tx);
    const negative = await q(`
        SELECT w.user_id FROM garage_wallets w
          LEFT JOIN (SELECT user_id, SUM(amount) AS total FROM garage_transactions GROUP BY user_id) t
                 ON t.user_id = w.user_id
         WHERE COALESCE(t.total, 0) < 0`, tx);
    if (negative.length) throw new Error(`Crédits de conversion déjà dépensés par ${negative.length} joueur(s) : rollback refusé.`);
    await exec(`UPDATE garage_wallets w
                   SET balance = COALESCE((SELECT SUM(t.amount) FROM garage_transactions t WHERE t.user_id = w.user_id), 0),
                       updated_at = now()`, tx);

    // Badge fondateur : seulement les attributions faites par la bascule.
    await exec(`DELETE FROM user_badges ub USING badges b
                 WHERE b.id = ub.badge_id AND b.code = :code AND ub.awarded_at = :at
                   AND NOT EXISTS (SELECT 1 FROM migration_beta_snapshot_user_badges s WHERE s.id = ub.id)`,
        tx, { code: PIONEER_BADGE, at });

    // Saisons créées par la bascule.
    await exec(`DELETE FROM season_scores WHERE season_id IN (SELECT id FROM seasons WHERE code IN (:codes))`, tx,
        { codes: [log.new_season_code, BETA_CODE] });
    await exec(`DELETE FROM season_final_standings WHERE season_id IN (SELECT id FROM seasons WHERE code IN (:codes))`, tx,
        { codes: [log.new_season_code, BETA_CODE] });
    await exec(`UPDATE pronostics SET season_id = NULL WHERE season_id IN (SELECT id FROM seasons WHERE code IN (:codes))`, tx,
        { codes: [log.new_season_code, BETA_CODE] });
    await exec(`DELETE FROM seasons WHERE code IN (:codes)`, tx, { codes: [log.new_season_code, BETA_CODE] });

    for (const t of [...SNAPSHOT_TABLES, "migration_beta_cutover"]) await exec(`DROP TABLE ${t}`, tx);
    return { rolledBack: true, cutoverAt: at };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    assertLocalDatabase();
    try {
        const report = await sequelize.transaction(async (tx) => {
            const r = MODE === "rollback" ? await rollback(tx) : await apply(tx);
            console.log(JSON.stringify(r, null, 2));
            if (MODE === "dry-run") throw new DryRunRollback();
            return r;
        });
        if (report) console.log(`✅ ${MODE} terminé.`);
    } catch (e) {
        if (e instanceof DryRunRollback) {
            console.log("ℹ️  DRY-RUN : transaction annulée, aucune donnée modifiée. Relancer avec --apply pour exécuter.");
        } else {
            console.error("❌ Échec, transaction annulée :", (e as Error).message);
            process.exitCode = 1;
        }
    } finally {
        await sequelize.close();
    }
}

void main();
