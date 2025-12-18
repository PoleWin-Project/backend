import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class PollVoteModel extends Model {
    declare id: BigId;
    declare pollId: BigId;
    declare optionId: BigId;
    declare userId: BigId;
    declare createdAt: Date;
}

export function initPollVoteModel(sequelize: Sequelize) {
    PollVoteModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            pollId: {
                field: "poll_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            optionId: {
                field: "option_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            userId: {
                field: "user_id",
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            createdAt: { field: "created_at", type: DataTypes.DATE },
        },
        {
            sequelize,
            tableName: "poll_votes",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ["poll_id", "user_id"],
                    name: "uq_poll_votes",
                },
            ],
        }
    );
}
