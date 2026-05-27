import { Sequelize } from "sequelize";
import { initModels } from "./initModels";

describe("initModels", () => {
    it("initialise tous les modèles et leurs associations", () => {
        const sequelize = new Sequelize("postgres://test:test@localhost/test", {
            dialect: "postgres",
            logging: false,
        });

        const models = initModels(sequelize);

        expect(models.UserModel).toBeDefined();
        expect(models.ProfileModel).toBeDefined();
        expect(models.FriendRequestModel).toBeDefined();
        expect(models.DirectMessageModel).toBeDefined();
        expect(models.RaceSessionModel).toBeDefined();
        expect(models.PredictionModel).toBeDefined();
        expect(models.PronosticModel).toBeDefined();
        expect(models.PronosticDetailModel).toBeDefined();
        expect(models.ChatChannelModel).toBeDefined();
        expect(models.ChannelMessageModel).toBeDefined();
        expect(models.LeagueModel).toBeDefined();
        expect(models.LeagueMemberModel).toBeDefined();
        expect(models.BadgeModel).toBeDefined();
        expect(models.BadgeRuleModel).toBeDefined();
        expect(models.UserBadgeModel).toBeDefined();
        expect(models.GamePlayModel).toBeDefined();
    });
});
