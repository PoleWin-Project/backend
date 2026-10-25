import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
} from "sequelize";

export type SeasonStatus = "upcoming" | "active" | "archived";

/**
 * Saison de championnat (ex. « Saison Bêta », « Saison 2026 »).
 * Les points de championnat sont toujours rattachés à une saison ; au plus une
 * saison est `active` à la fois (index unique partiel en base).
 */
export class SeasonModel extends Model<
	InferAttributes<SeasonModel>,
	InferCreationAttributes<SeasonModel>
> {
	declare id: CreationOptional<number>;
	declare code: string;
	declare name: string;
	declare status: SeasonStatus;
	declare startsAt: Date;
	declare endsAt: Date | null;
	declare archivedAt: Date | null;
	declare createdAt: CreationOptional<Date>;

	static initModel(sequelize: Sequelize) {
		SeasonModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
				name: { type: DataTypes.STRING(100), allowNull: false },
				status: { type: DataTypes.STRING(16), allowNull: false },
				startsAt: { type: DataTypes.DATE, allowNull: false, field: "starts_at" },
				endsAt: { type: DataTypes.DATE, allowNull: true, field: "ends_at" },
				archivedAt: { type: DataTypes.DATE, allowNull: true, field: "archived_at" },
				createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at", defaultValue: DataTypes.NOW },
			},
			{ sequelize, tableName: "seasons", timestamps: false, underscored: true },
		);
		return SeasonModel;
	}
}
