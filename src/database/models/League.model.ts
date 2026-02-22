import {
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Model,
	Sequelize,
	Association,
	BelongsToGetAssociationMixin,
	HasManyGetAssociationsMixin,
} from "sequelize";
import type { UserModel } from "./User.model";
import type { LeagueMemberModel } from "./LeagueMember.model";

export class LeagueModel extends Model<
	InferAttributes<LeagueModel>,
	InferCreationAttributes<LeagueModel>
> {
	declare id: CreationOptional<number>;
	declare name: string;
	declare ownerUserId: number;
	declare seasonYear: number;
	declare inviteCode: string | null;
	declare createdAt: CreationOptional<Date>;

	declare getOwner: BelongsToGetAssociationMixin<UserModel>;
	declare getMembers: HasManyGetAssociationsMixin<LeagueMemberModel>;

	declare owner?: UserModel;
	declare members?: LeagueMemberModel[];

	declare static associations: {
		owner: Association<LeagueModel, UserModel>;
		members: Association<LeagueModel, LeagueMemberModel>;
	};

	static initModel(sequelize: Sequelize) {
		LeagueModel.init(
			{
				id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
				name: { type: DataTypes.STRING, allowNull: false },
				ownerUserId: { type: DataTypes.INTEGER, allowNull: false, field: "owner_user_id" },
				seasonYear: { type: DataTypes.INTEGER, allowNull: false, field: "season_year" },
				inviteCode: { type: DataTypes.STRING, allowNull: true, unique: true, field: "invite_code" },
				createdAt: {
					type: DataTypes.DATE,
					allowNull: false,
					field: "created_at",
					defaultValue: DataTypes.NOW,
				},
			},
			{
				sequelize,
				tableName: "leagues",
				timestamps: false,
				underscored: true,
			}
		);

		return LeagueModel;
	}
}
