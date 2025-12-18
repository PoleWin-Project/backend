import { DataTypes, Model, Sequelize } from "sequelize";
import type { BigId } from "./_types";

export class PollOptionModel extends Model {
    declare id: BigId;
    declare pollId: BigId;
    declare label: string;
    declare sortOrder: number;
}

export function initPollOptionModel(sequelize: Sequelize) {
    PollOptionModel.init(
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
            label: { type: DataTypes.STRING(200), allowNull: false },
            sortOrder: {
                field: "sort_order",
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        },
        {
            sequelize,
            tableName: "poll_options",
            timestamps: false,
            underscored: true,
        }
    );
}
