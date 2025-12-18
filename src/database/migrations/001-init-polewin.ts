import type { QueryInterface } from "sequelize";
import SequelizePkg from "sequelize";
const { DataTypes, Sequelize } = SequelizePkg;

export async function up({ context: qi }: { context: QueryInterface }) {
    // Extension
    await qi.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // =========================
    // USERS & AUTH
    // =========================
    await qi.createTable("users", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        password_hash: { type: DataTypes.STRING(255), allowNull: true },
        date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
        country: { type: DataTypes.STRING(100), allowNull: true },
        language: { type: DataTypes.STRING(20), allowNull: true },
        is_email_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        last_login_at: { type: DataTypes.DATE, allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("user_profiles", {
        user_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        display_name: { type: DataTypes.STRING(100), allowNull: true },
        avatar_url: { type: DataTypes.STRING(500), allowNull: true },
        bio: { type: DataTypes.TEXT, allowNull: true },
        favorite_team_code: { type: DataTypes.STRING(50), allowNull: true },
        favorite_driver_code: { type: DataTypes.STRING(50), allowNull: true },
        time_zone: { type: DataTypes.STRING(64), allowNull: true },
        is_profile_public: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        show_stats: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("roles", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
    });

    await qi.createTable("user_roles", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        role_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "roles", key: "id" },
            onDelete: "CASCADE",
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("user_roles", {
        type: "unique",
        fields: ["user_id", "role_id"],
        name: "uq_user_roles",
    });

    // =========================
    // PREDICTIONS
    // =========================
    await qi.createTable("prediction_rules", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        session_type: { type: DataTypes.STRING(50), allowNull: false },
        code: { type: DataTypes.STRING(50), allowNull: false },
        label: { type: DataTypes.STRING(120), allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        max_points: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("prediction_rules", {
        type: "unique",
        fields: ["session_type", "code"],
        name: "uq_prediction_rules",
    });

    await qi.createTable("prediction_contests", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        type: { type: DataTypes.STRING(50), allowNull: false },
        title: { type: DataTypes.STRING(200), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        session_external_id: { type: DataTypes.STRING(100), allowNull: true },
        season_year: { type: DataTypes.INTEGER, allowNull: true },
        opens_at: { type: DataTypes.DATE, allowNull: true },
        closes_at: { type: DataTypes.DATE, allowNull: true },
        max_budget_points: { type: DataTypes.INTEGER, allowNull: true },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("prediction_sets", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        contest_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "prediction_contests", key: "id" },
            onDelete: "CASCADE",
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        locked_at: { type: DataTypes.DATE, allowNull: true },
        status: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: "draft",
        },
        total_points_earned: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    });
    await qi.addConstraint("prediction_sets", {
        type: "unique",
        fields: ["user_id", "contest_id"],
        name: "uq_prediction_sets",
    });

    await qi.createTable("prediction_items", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        prediction_set_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "prediction_sets", key: "id" },
            onDelete: "CASCADE",
        },
        prediction_rule_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "prediction_rules", key: "id" },
            onDelete: "RESTRICT",
        },
        driver_external_id: { type: DataTypes.STRING(100), allowNull: true },
        team_external_id: { type: DataTypes.STRING(100), allowNull: true },
        value_text: { type: DataTypes.STRING(255), allowNull: true },
        points_earned: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("prediction_items", {
        type: "unique",
        fields: ["prediction_set_id", "prediction_rule_id"],
        name: "uq_prediction_items",
    });

    // =========================
    // SCORES
    // =========================
    await qi.createTable("user_session_scores", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        session_external_id: { type: DataTypes.STRING(100), allowNull: false },
        points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        rank_global: { type: DataTypes.INTEGER, allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("user_session_scores", {
        type: "unique",
        fields: ["user_id", "session_external_id"],
        name: "uq_user_session_scores",
    });

    await qi.createTable("user_season_scores", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        season_year: { type: DataTypes.INTEGER, allowNull: false },
        total_points: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        rank_global: { type: DataTypes.INTEGER, allowNull: true },
        last_updated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("user_season_scores", {
        type: "unique",
        fields: ["user_id", "season_year"],
        name: "uq_user_season_scores",
    });

    // =========================
    // LEAGUES
    // =========================
    await qi.createTable("leagues", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(120), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        owner_user_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },
        season_year: { type: DataTypes.INTEGER, allowNull: true },
        is_public: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        invite_code: {
            type: DataTypes.STRING(64),
            allowNull: true,
            unique: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("league_members", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        league_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "leagues", key: "id" },
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        role: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: "member",
        },
        joined_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("league_members", {
        type: "unique",
        fields: ["league_id", "user_id"],
        name: "uq_league_members",
    });

    await qi.createTable("league_scores", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        league_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "leagues", key: "id" },
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        season_year: { type: DataTypes.INTEGER, allowNull: false },
        total_points: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("league_scores", {
        type: "unique",
        fields: ["league_id", "user_id", "season_year"],
        name: "uq_league_scores",
    });

    // =========================
    // CHAT + POLLS
    // =========================
    await qi.createTable("chat_rooms", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        type: { type: DataTypes.STRING(30), allowNull: false },
        name: { type: DataTypes.STRING(120), allowNull: true },
        session_external_id: { type: DataTypes.STRING(100), allowNull: true },
        league_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: "leagues", key: "id" },
            onDelete: "CASCADE",
        },
        is_read_only: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("chat_messages", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        room_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "chat_rooms", key: "id" },
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },
        content: { type: DataTypes.TEXT, allowNull: true },
        message_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: "text",
        },
        parent_message_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: "chat_messages", key: "id" },
            onDelete: "SET NULL",
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("chat_reactions", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        message_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "chat_messages", key: "id" },
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        emoji: { type: DataTypes.STRING(20), allowNull: false },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("chat_reactions", {
        type: "unique",
        fields: ["message_id", "user_id", "emoji"],
        name: "uq_chat_reactions",
    });

    await qi.createTable("polls", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        room_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "chat_rooms", key: "id" },
            onDelete: "CASCADE",
        },
        message_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: "chat_messages", key: "id" },
            onDelete: "SET NULL",
        },
        question: { type: DataTypes.TEXT, allowNull: false },
        created_by_user_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        closes_at: { type: DataTypes.DATE, allowNull: true },
    });

    await qi.createTable("poll_options", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        poll_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "polls", key: "id" },
            onDelete: "CASCADE",
        },
        label: { type: DataTypes.STRING(200), allowNull: false },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    });

    await qi.createTable("poll_votes", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        poll_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "polls", key: "id" },
            onDelete: "CASCADE",
        },
        option_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "poll_options", key: "id" },
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("poll_votes", {
        type: "unique",
        fields: ["poll_id", "user_id"],
        name: "uq_poll_votes",
    });

    // =========================
    // STATS / BADGES / XP
    // =========================
    await qi.createTable("user_stats", {
        user_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        xp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total_gp_played: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        total_sessions_played: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        current_streak_days: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        longest_streak_days: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("badges", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(120), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        category: { type: DataTypes.STRING(50), allowNull: true },
        icon_url: { type: DataTypes.STRING(500), allowNull: true },
        rarity: { type: DataTypes.STRING(30), allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("user_badges", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        badge_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "badges", key: "id" },
            onDelete: "CASCADE",
        },
        earned_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        source: { type: DataTypes.STRING(50), allowNull: true },
    });
    await qi.addConstraint("user_badges", {
        type: "unique",
        fields: ["user_id", "badge_id"],
        name: "uq_user_badges",
    });

    await qi.createTable("xp_events", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        type: { type: DataTypes.STRING(50), allowNull: false },
        amount: { type: DataTypes.INTEGER, allowNull: false },
        metadata: { type: DataTypes.JSONB, allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    // =========================
    // WAITLIST / NOTIFS / SETTINGS
    // =========================
    await qi.createTable("waitlist_signups", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        email: { type: DataTypes.STRING(255), allowNull: false },
        source: { type: DataTypes.STRING(50), allowNull: true },
        referral_code: { type: DataTypes.STRING(64), allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("notifications", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        type: { type: DataTypes.STRING(50), allowNull: false },
        payload: { type: DataTypes.JSONB, allowNull: true },
        is_read: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("user_settings", {
        user_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        email_notifications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        push_notifications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        discord_notifications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        language: { type: DataTypes.STRING(20), allowNull: true },
        timezone: { type: DataTypes.STRING(64), allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    // =========================
    // MODERATION
    // =========================
    await qi.createTable("reports", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        reporter_user_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },
        target_type: { type: DataTypes.STRING(50), allowNull: false },
        target_id: { type: DataTypes.BIGINT, allowNull: false },
        reason: { type: DataTypes.STRING(120), allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        status: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: "open",
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        resolved_at: { type: DataTypes.DATE, allowNull: true },
        resolved_by_user_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },
    });

    await qi.createTable("bans", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        reason: { type: DataTypes.TEXT, allowNull: true },
        banned_until: { type: DataTypes.DATE, allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });

    await qi.createTable("consents", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        type: { type: DataTypes.STRING(50), allowNull: false },
        version: { type: DataTypes.STRING(50), allowNull: true },
        accepted_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        ip_address: { type: DataTypes.STRING(64), allowNull: true },
    });

    await qi.createTable("age_verifications", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        birth_date: { type: DataTypes.DATEONLY, allowNull: false },
        is_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        method: { type: DataTypes.STRING(50), allowNull: true },
        verified_at: { type: DataTypes.DATE, allowNull: true },
    });

    // =========================
    // ASSETS
    // =========================
    await qi.createTable("track_assets", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        circuit_external_id: { type: DataTypes.STRING(100), allowNull: false },
        name: { type: DataTypes.STRING(120), allowNull: true },
        top_view_image_url: { type: DataTypes.STRING(500), allowNull: true },
        svg_path: { type: DataTypes.TEXT, allowNull: true },
        thumbnail_url: { type: DataTypes.STRING(500), allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("track_assets", {
        type: "unique",
        fields: ["circuit_external_id"],
        name: "uq_track_assets",
    });

    await qi.createTable("car_assets", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        season_year: { type: DataTypes.INTEGER, allowNull: false },
        team_external_id: { type: DataTypes.STRING(100), allowNull: false },
        top_view_image_url: { type: DataTypes.STRING(500), allowNull: true },
        primary_color: { type: DataTypes.STRING(30), allowNull: true },
        secondary_color: { type: DataTypes.STRING(30), allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW()"),
        },
    });
    await qi.addConstraint("car_assets", {
        type: "unique",
        fields: ["season_year", "team_external_id"],
        name: "uq_car_assets",
    });

    // =========================
    // INDEXES
    // =========================
    await qi.addIndex("chat_messages", ["room_id", "created_at"], {
        name: "idx_chat_messages_room_created",
    });
    await qi.addIndex("notifications", ["user_id", "created_at"], {
        name: "idx_notifications_user_created",
    });
    await qi.addIndex("prediction_sets", ["user_id"], {
        name: "idx_prediction_sets_user",
    });
    await qi.addIndex("league_members", ["user_id"], {
        name: "idx_league_members_user",
    });
    await qi.addIndex("reports", ["target_type", "target_id"], {
        name: "idx_reports_target",
    });
}

export async function down({ context: qi }: { context: QueryInterface }) {
    // drop indexes first (safe)
    await qi.removeIndex("reports", "idx_reports_target").catch(() => {});
    await qi
        .removeIndex("league_members", "idx_league_members_user")
        .catch(() => {});
    await qi
        .removeIndex("prediction_sets", "idx_prediction_sets_user")
        .catch(() => {});
    await qi
        .removeIndex("notifications", "idx_notifications_user_created")
        .catch(() => {});
    await qi
        .removeIndex("chat_messages", "idx_chat_messages_room_created")
        .catch(() => {});

    // drop tables reverse order
    await qi.dropTable("car_assets");
    await qi.dropTable("track_assets");

    await qi.dropTable("age_verifications");
    await qi.dropTable("consents");
    await qi.dropTable("bans");
    await qi.dropTable("reports");

    await qi.dropTable("user_settings");
    await qi.dropTable("notifications");
    await qi.dropTable("waitlist_signups");

    await qi.dropTable("xp_events");
    await qi.dropTable("user_badges");
    await qi.dropTable("badges");
    await qi.dropTable("user_stats");

    await qi.dropTable("poll_votes");
    await qi.dropTable("poll_options");
    await qi.dropTable("polls");
    await qi.dropTable("chat_reactions");
    await qi.dropTable("chat_messages");
    await qi.dropTable("chat_rooms");

    await qi.dropTable("league_scores");
    await qi.dropTable("league_members");
    await qi.dropTable("leagues");

    await qi.dropTable("user_season_scores");
    await qi.dropTable("user_session_scores");

    await qi.dropTable("prediction_items");
    await qi.dropTable("prediction_sets");
    await qi.dropTable("prediction_contests");
    await qi.dropTable("prediction_rules");

    await qi.dropTable("user_roles");
    await qi.dropTable("roles");
    await qi.dropTable("user_profiles");
    await qi.dropTable("users");
}