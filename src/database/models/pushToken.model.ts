import {
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    Model,
    Sequelize,
    Association,
    BelongsToGetAssociationMixin,
} from "sequelize";
import type { UserModel } from "./User.model";

export class PushTokenModel extends Model<
    InferAttributes<PushTokenModel>,
    InferCreationAttributes<PushTokenModel>
> {
    declare id: CreationOptional<number>;
    declare userId: number;
    declare token: string;
    declare platform: CreationOptional<string | null>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare getUser: BelongsToGetAssociationMixin<UserModel>;
    declare user?: UserModel;

    declare static associations: {
        user: Association<PushTokenModel, UserModel>;
    };

    static initModel(sequelize: Sequelize) {
        PushTokenModel.init(
            {
                id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
                userId:    { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
                token:     { type: DataTypes.STRING,  allowNull: false, unique: true },
                platform:  { type: DataTypes.STRING,  allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at", defaultValue: DataTypes.NOW },
                updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at", defaultValue: DataTypes.NOW },
            },
            {
                sequelize,
                tableName: "push_tokens",
                timestamps: true,
                underscored: true,
                indexes: [
                    { fields: ["user_id"], name: "push_tokens_user_id_idx" },
                ],
            }
        );
        return PushTokenModel;
    }
}
