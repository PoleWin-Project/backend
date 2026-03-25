import { QueryInterface } from "sequelize";

const badges = [
    {
        code:        "first_bet",
        name:        "Premier Pari",
        description: "Placer son tout premier pronostic",
        image_url:   "/badges/first-bet.svg",
        rarity:      "common",
        rules: [{ rule_type: "total_pronostics", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "visionnaire",
        name:        "Visionnaire",
        description: "Gagner 3 pronostics consécutifs",
        image_url:   "/badges/visionnaire.svg",
        rarity:      "rare",
        rules: [{ rule_type: "consecutive_wins", threshold: 3, comparison_type: "gte" }],
    },
    {
        code:        "pole_hunter",
        name:        "Chasseur de Pole",
        description: "Prédire correctement 5 pole positions",
        image_url:   "/badges/pole-hunter.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "correct_pole_position", threshold: 5, comparison_type: "gte" }],
    },
    {
        code:        "all_in",
        name:        "All-in",
        description: "Miser 100 points ou plus sur un seul pari",
        image_url:   "/badges/allin.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "single_bet_stake", threshold: 100, comparison_type: "gte" }],
    },
    {
        code:        "millionaire",
        name:        "Millionnaire",
        description: "Atteindre 1000 points au total",
        image_url:   "/badges/millionaire.svg",
        rarity:      "rare",
        rules: [{ rule_type: "total_points", threshold: 1000, comparison_type: "gte" }],
    },
    {
        code:        "grid_fan",
        name:        "Fan de la Grille",
        description: "Placer un pronostic sur 10 sessions différentes",
        image_url:   "/badges/grid-fan.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "sessions_with_pronostic", threshold: 10, comparison_type: "gte" }],
    },
    {
        code:        "sherlock",
        name:        "Sherlock",
        description: "Prédire un Safety Car correctement",
        image_url:   "/badges/sherlock.svg",
        rarity:      "rare",
        rules: [{ rule_type: "correct_safety_car", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "podium_perfect",
        name:        "Podium Parfait",
        description: "Prédire le podium complet dans le bon ordre",
        image_url:   "/badges/podium.svg",
        rarity:      "epic",
        rules: [{ rule_type: "correct_podium_finish", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "comeback",
        name:        "Retour de Flamme",
        description: "Gagner un pari après 5 défaites consécutives",
        image_url:   "/badges/comeback.svg",
        rarity:      "rare",
        rules: [{ rule_type: "win_after_loss_streak", threshold: 5, comparison_type: "gte" }],
    },
    {
        code:        "polewin_legend",
        name:        "Légende PoleWin",
        description: "Maintenir un taux de réussite supérieur à 70% sur 20 pronostics minimum",
        image_url:   "/badges/legend.svg",
        rarity:      "legendary",
        rules: [{ rule_type: "win_rate_min_20", threshold: 70, comparison_type: "gte" }],
    },

    // ── Badges fun / rares / loufoques ────────────────────────────────────────

    {
        code:        "drs_open",
        name:        "DRS Ouvert",
        description: "Placer un pari dans les 30 secondes après l'ouverture des paris d'une session",
        image_url:   "/badges/drs-open.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "bet_within_30s_of_open", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "verstappening",
        name:        "Verstappening",
        description: "Gagner 10 pronostics consécutifs sans jamais perdre",
        image_url:   "/badges/verstappening.svg",
        rarity:      "legendary",
        rules: [{ rule_type: "consecutive_wins", threshold: 10, comparison_type: "gte" }],
    },
    {
        code:        "mur_de_monaco",
        name:        "Mur de Monaco",
        description: "Perdre 10 paris d'affilée sans abandonner",
        image_url:   "/badges/mur-de-monaco.svg",
        rarity:      "rare",
        rules: [{ rule_type: "consecutive_losses", threshold: 10, comparison_type: "gte" }],
    },
    {
        code:        "parc_ferme",
        name:        "Parc Fermé",
        description: "Ne jamais modifier un pronostic une fois posé — sur 20 paris minimum",
        image_url:   "/badges/parc-ferme.svg",
        rarity:      "rare",
        rules: [{ rule_type: "never_updated_pronostic_min_20", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "commissaires",
        name:        "Commissaires de Course",
        description: "Avoir un pronostic annulé suite à une session supprimée par un admin",
        image_url:   "/badges/commissaires.svg",
        rarity:      "epic",
        rules: [{ rule_type: "pronostic_voided", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "grid_penalty",
        name:        "Grid Penalty",
        description: "Miser 0 point sur un pari gagnant (pari en mode draft non soumis)",
        image_url:   "/badges/grid-penalty.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "zero_stake_correct", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "vol_de_donnees",
        name:        "Vol de Données",
        description: "Être le premier utilisateur inscrit sur PoleWin — badge unique",
        image_url:   "/badges/vol-de-donnees.svg",
        rarity:      "legendary",
        rules: [{ rule_type: "user_rank_by_created_at", threshold: 1, comparison_type: "eq" }],
    },
    {
        code:        "minuit_singapour",
        name:        "Minuit à Singapour",
        description: "Poser un pari entre 23h et 4h du matin (heure locale serveur)",
        image_url:   "/badges/minuit-singapour.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "bet_between_23h_and_4h", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "chat_de_paddock",
        name:        "Chat de Paddock",
        description: "Envoyer 500 messages dans les chats de session",
        image_url:   "/badges/chat-paddock.svg",
        rarity:      "rare",
        rules: [{ rule_type: "total_messages_sent", threshold: 500, comparison_type: "gte" }],
    },
    {
        code:        "pole_position_polewin",
        name:        "Pole Position PoleWin",
        description: "Être 1er au classement global pendant 7 jours consécutifs",
        image_url:   "/badges/pole-position-polewin.svg",
        rarity:      "legendary",
        rules: [{ rule_type: "leaderboard_rank1_days", threshold: 7, comparison_type: "gte" }],
    },
    // ── Badges purement drôles ────────────────────────────────────────────────

    {
        code:        "bernie_ecclestone",
        name:        "Bernie Ecclestone",
        description: "Dépenser plus de 5000 points en paris et finir avec moins de 10 points",
        image_url:   "/badges/bernie.svg",
        rarity:      "rare",
        rules: [{ rule_type: "spent_5000_below_10_points", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "ted_kravitz",
        name:        "Journaliste Ted Kravitz",
        description: "Poster 10 messages dans le chat d'une même session",
        image_url:   "/badges/ted.svg",
        rarity:      "common",
        rules: [{ rule_type: "messages_in_single_session", threshold: 10, comparison_type: "gte" }],
    },
    {
        code:        "quali_q1",
        name:        "Quali Q1",
        description: "Être éliminé du top 10 d'une league dès la première semaine",
        image_url:   "/badges/q1.svg",
        rarity:      "common",
        rules: [{ rule_type: "dropped_from_top10_week1", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "safety_car_virtuel",
        name:        "Safety Car Virtuel",
        description: "Modifier un pronostic 3 fois avant de le soumettre",
        image_url:   "/badges/vsc.svg",
        rarity:      "common",
        rules: [{ rule_type: "pronostic_updated_3_times", threshold: 3, comparison_type: "gte" }],
    },
    {
        code:        "alonso_mode",
        name:        "Alonso Mode",
        description: "Perdre un pari sur le vainqueur de course en ayant misé sur Fernando Alonso",
        image_url:   "/badges/alonso.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "lost_bet_on_alonso_winner", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "dhl_fastest_pit",
        name:        "DHL Fastest Pit",
        description: "Soumettre un pari en moins de 5 secondes après l'ouverture des paris",
        image_url:   "/badges/dhl.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "bet_within_5s_of_open", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "tas_vu_la_meteo",
        name:        "T'as vu la météo ?",
        description: "Prédire correctement un Safety Car lors d'un Grand Prix sous la pluie",
        image_url:   "/badges/meteo.svg",
        rarity:      "rare",
        rules: [{ rule_type: "correct_sc_wet_race", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "stewards_investigation",
        name:        "Stewards Investigation",
        description: "Avoir 5 pronostics simultanément en statut awaiting_verification",
        image_url:   "/badges/stewards.svg",
        rarity:      "rare",
        rules: [{ rule_type: "concurrent_awaiting_verification", threshold: 5, comparison_type: "gte" }],
    },
    {
        code:        "cest_les_points",
        name:        "C'est les points qui comptent",
        description: "Gagner exactement 1 point sur un pari",
        image_url:   "/badges/1point.svg",
        rarity:      "uncommon",
        rules: [{ rule_type: "earned_exactly_1_point", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "hammer_time",
        name:        "Hammer Time",
        description: "Parier sur Lewis Hamilton vainqueur — et avoir raison",
        image_url:   "/badges/hammer.svg",
        rarity:      "epic",
        rules: [{ rule_type: "correct_hamilton_winner", threshold: 1, comparison_type: "gte" }],
    },
    {
        code:        "perez_baku_t1",
        name:        "Pérez Turn 1 Bakou",
        description: "Miser 100 000 points ou plus sur un seul pari — et perdre. Crash total, saison fichue.",
        image_url:   "/badges/perez-baku.svg",
        rarity:      "legendary",
        rules: [{ rule_type: "lost_single_bet_stake", threshold: 100000, comparison_type: "gte" }],
    },
] as const;

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    const now = new Date();

    for (const badge of badges) {
        const [result] = await queryInterface.sequelize.query(
            `INSERT INTO badges (name, code, description, image_url, rarity, created_at)
             SELECT :name, :code, :description, :imageUrl, :rarity, :now
             WHERE NOT EXISTS (SELECT 1 FROM badges WHERE code = :code)
             RETURNING id`,
            {
                replacements: {
                    name:        badge.name,
                    code:        badge.code,
                    description: badge.description,
                    imageUrl:    badge.image_url,
                    rarity:      badge.rarity,
                    now,
                },
            },
        );

        const rows = result as { id: number }[];
        if (rows.length === 0) continue; // already seeded

        const badgeId = rows[0].id;

        for (const rule of badge.rules) {
            await queryInterface.sequelize.query(
                `INSERT INTO badge_rules (badge_id, rule_type, threshold, comparison_type)
                 VALUES (:badgeId, :ruleType, :threshold, :comparisonType)`,
                {
                    replacements: {
                        badgeId,
                        ruleType:       rule.rule_type,
                        threshold:      rule.threshold,
                        comparisonType: rule.comparison_type,
                    },
                },
            );
        }
    }
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    const codes = badges.map(b => `'${b.code}'`).join(", ");
    await queryInterface.sequelize.query(
        `DELETE FROM badges WHERE code IN (${codes})`,
    );
}
