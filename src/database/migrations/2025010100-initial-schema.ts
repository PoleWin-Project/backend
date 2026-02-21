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
        time_zone: { type: DataTypes.STRING, allowNull: true },
        is_profile_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
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

    await queryInterface.createTable("conversations", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        user1_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        user2_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex("conversations", ["user1_id", "user2_id"], {
        unique: true,
        name: "conversations_user1_user2_unique",
    });

    await queryInterface.createTable("messages", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        conversation_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "conversations", key: "id" },
            onDelete: "CASCADE",
        },
        content: { type: DataTypes.TEXT, allowNull: false },
        is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex("messages", ["conversation_id", "created_at"], {
        name: "messages_conv_created_idx",
    });

    await queryInterface.createTable("predictions", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        title: { type: DataTypes.STRING, allowNull: false },
        session_external_id: { type: DataTypes.STRING, allowNull: true },
        season_year: { type: DataTypes.INTEGER, allowNull: true },
        opens_at: { type: DataTypes.DATE, allowNull: true },
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
        type: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
        locked_at: { type: DataTypes.DATE, allowNull: true },
        points_earned: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex("pronostics", ["user_id", "prediction_id", "type"], {
        unique: true,
        name: "pronostics_user_prediction_type_unique",
    });
    await queryInterface.addIndex("pronostics", ["prediction_id"], { name: "pronostics_prediction_idx" });
    await queryInterface.addIndex("pronostics", ["user_id"], { name: "pronostics_user_idx" });

    await queryInterface.createTable("pronostics_safety_car", {
        pronostic_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "pronostics", key: "id" },
            onDelete: "CASCADE",
        },
        safety_car: { type: DataTypes.BOOLEAN, allowNull: false },
    });

    await queryInterface.createTable("pronostics_winner_driver", {
        pronostic_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "pronostics", key: "id" },
            onDelete: "CASCADE",
        },
        driver_code: { type: DataTypes.STRING, allowNull: false },
    });

    await queryInterface.createTable("pronostics_winner_team", {
        pronostic_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: { model: "pronostics", key: "id" },
            onDelete: "CASCADE",
        },
        team_code: { type: DataTypes.STRING, allowNull: false },
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.dropTable("pronostics_winner_team");
    await queryInterface.dropTable("pronostics_winner_driver");
    await queryInterface.dropTable("pronostics_safety_car");
    await queryInterface.dropTable("pronostics");
    await queryInterface.dropTable("predictions");
    await queryInterface.dropTable("messages");
    await queryInterface.dropTable("conversations");
    await queryInterface.dropTable("league_members");
    await queryInterface.dropTable("leagues");
    await queryInterface.dropTable("profiles");
    await queryInterface.dropTable("users");
}
