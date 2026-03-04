import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {

    await queryInterface.createTable("users", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        password_hash: { type: DataTypes.STRING, allowNull: false },
        is_email_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        last_login_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.createTable("profiles", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        display_name: { type: DataTypes.STRING, allowNull: true },
        avatar_url: { type: DataTypes.STRING, allowNull: true },
        bio: { type: DataTypes.TEXT, allowNull: true },
        points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        favorite_team_code: { type: DataTypes.STRING, allowNull: true },
        favorite_driver_code: { type: DataTypes.STRING, allowNull: true },
        is_profile_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.createTable("race_sessions", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        id_course_external: { type: DataTypes.INTEGER, allowNull: true },
        name: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        date_start: { type: DataTypes.DATE, allowNull: true },
    });

    await queryInterface.createTable("predictions", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "race_sessions", key: "id" },
            onDelete: "CASCADE",
        },
        title: { type: DataTypes.STRING, allowNull: false },
        scope: { type: DataTypes.STRING, allowNull: true },
        closes_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.createTable("pronostics", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        prediction_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "predictions", key: "id" },
            onDelete: "CASCADE",
        },
        points_staked: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        points_earned: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
    });

    await queryInterface.addIndex("pronostics", ["user_id", "prediction_id"], {
        unique: true,
        name: "pronostics_user_prediction_unique",
    });
    await queryInterface.addIndex("pronostics", ["prediction_id"], { name: "pronostics_prediction_idx" });
    await queryInterface.addIndex("pronostics", ["user_id"], { name: "pronostics_user_idx" });

    await queryInterface.createTable("pronostics_details", {
        pronostic_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "pronostics", key: "id" },
            onDelete: "CASCADE",
        },
        value: { type: DataTypes.STRING, allowNull: false },
        multiplier: { type: DataTypes.FLOAT, allowNull: true },
    });

    await queryInterface.createTable("chat_channels", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "race_sessions", key: "id" },
            onDelete: "CASCADE",
        },
    });

    await queryInterface.createTable("messages", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        channel_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "chat_channels", key: "id" },
            onDelete: "CASCADE",
        },
        content: { type: DataTypes.TEXT, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex("messages", ["channel_id", "created_at"], {
        name: "messages_channel_created_idx",
    });

    await queryInterface.createTable("leagues", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        owner_user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        season_year: { type: DataTypes.INTEGER, allowNull: false },
        invite_code: { type: DataTypes.STRING, allowNull: true, unique: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.createTable("league_members", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        league_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "leagues", key: "id" },
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        joined_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex("league_members", ["league_id", "user_id"], {
        unique: true,
        name: "league_members_league_user_unique",
    });

    await queryInterface.createTable("badges", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        code: { type: DataTypes.STRING, allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        image_url: { type: DataTypes.STRING, allowNull: true },
        rarity: { type: DataTypes.STRING, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.createTable("badge_rules", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        badge_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "badges", key: "id" },
            onDelete: "CASCADE",
        },
        rule_type: { type: DataTypes.STRING, allowNull: false },
        threshold: { type: DataTypes.INTEGER, allowNull: true },
        comparison_type: { type: DataTypes.STRING, allowNull: true },
    });

    await queryInterface.createTable("user_badges", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        badge_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "badges", key: "id" },
            onDelete: "CASCADE",
        },
        awarded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex("user_badges", ["user_id", "badge_id"], {
        unique: true,
        name: "user_badges_user_badge_unique",
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.dropTable("user_badges");
    await queryInterface.dropTable("badge_rules");
    await queryInterface.dropTable("badges");
    await queryInterface.dropTable("league_members");
    await queryInterface.dropTable("leagues");
    await queryInterface.dropTable("messages");
    await queryInterface.dropTable("chat_channels");
    await queryInterface.dropTable("pronostics_details");
    await queryInterface.dropTable("pronostics");
    await queryInterface.dropTable("predictions");
    await queryInterface.dropTable("race_sessions");
    await queryInterface.dropTable("profiles");
    await queryInterface.dropTable("users");
}
