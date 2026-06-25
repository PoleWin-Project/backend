import {
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    Model,
    Sequelize,
} from "sequelize";

export class GamePlayModel extends Model<
    InferAttributes<GamePlayModel>,
    InferCreationAttributes<GamePlayModel>
> {
    declare id:       CreationOptional<number>;
    declare userId:   number;
    declare gameId:   string;
    declare points:   number;
    declare metricMs: CreationOptional<number | null>;
    declare playedAt: CreationOptional<Date>;

    static initModel(sequelize: Sequelize) {
        GamePlayModel.init(
            {
                id:     { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
                userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
                gameId: { type: DataTypes.STRING(64), allowNull: false, field: "game_id" },
                points: { type: DataTypes.INTEGER, allowNull: false },
                metricMs: { type: DataTypes.INTEGER, allowNull: true, field: "metric_ms" },
                playedAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                    field: "played_at",
                },
            },
            {
                sequelize,
                tableName: "game_plays",
                timestamps: false,
                underscored: true,
            }
        );
        return GamePlayModel;
    }
}
