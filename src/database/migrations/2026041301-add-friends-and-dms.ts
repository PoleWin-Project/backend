import { DataTypes, QueryInterface } from "sequelize";

export async function up({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.createTable("friend_requests", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        receiver_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex("friend_requests", ["sender_id", "receiver_id"], {
        unique: true,
        name: "friend_requests_sender_receiver_unique",
    });
    await queryInterface.addIndex("friend_requests", ["receiver_id", "status"], {
        name: "friend_requests_receiver_status_idx",
    });

    await queryInterface.createTable("direct_messages", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        receiver_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
        },
        content: { type: DataTypes.TEXT, allowNull: false },
        is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex("direct_messages", ["sender_id", "receiver_id", "created_at"], {
        name: "dm_sender_receiver_created_idx",
    });
    await queryInterface.addIndex("direct_messages", ["receiver_id", "is_read"], {
        name: "dm_receiver_read_idx",
    });
}

export async function down({ context: queryInterface }: { context: QueryInterface }) {
    await queryInterface.dropTable("direct_messages");
    await queryInterface.dropTable("friend_requests");
}
