jest.mock('../database/models', () => ({
    SeasonModel: { findAll: jest.fn() },
    SeasonFinalStandingModel: { findAll: jest.fn() },
}));
jest.mock('../database/sequelize', () => ({ sequelize: { query: jest.fn() } }));
import { SeasonModel, SeasonFinalStandingModel } from '../database/models';
import { sequelize } from '../database/sequelize';
import { seasonsService } from '../modules/seasons/seasons.service';

beforeEach(() => {
    jest.resetAllMocks();
    (SeasonModel.findAll as jest.Mock).mockResolvedValue([{ id: 1, code: 'beta', name: 'Saison Bêta' }]);
    (SeasonFinalStandingModel.findAll as jest.Mock).mockResolvedValue([]);
});
it('affiche les statistiques sauvegardées sans attribuer de rang au joueur exclu du classement', async () => {
    (sequelize.query as jest.Mock).mockResolvedValueOnce([{ profiles: 'snapshot_profiles', pronostics: 'snapshot_pronostics' }])
        .mockResolvedValueOnce([{ correct: 2, incorrect: 1, resolved: 3 }]);
    expect(await seasonsService.getHistory(2)).toEqual([{ seasonCode: 'beta', seasonName: 'Saison Bêta', rank: null, participants: null, stats: { correct: 2, incorrect: 1, resolved: 3 } }]);
    expect(sequelize.query).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ replacements: { userId: 2 } }));
});
it('ne crée pas de participation pour un joueur absent du snapshot', async () => {
    (sequelize.query as jest.Mock).mockResolvedValueOnce([{ profiles: 'snapshot_profiles', pronostics: 'snapshot_pronostics' }]).mockResolvedValueOnce([]);
    expect(await seasonsService.getHistory(99)).toEqual([]);
});
it('supporte une base sans sauvegarde de migration bêta', async () => {
    (sequelize.query as jest.Mock).mockResolvedValueOnce([{ profiles: null, pronostics: null }]);
    expect(await seasonsService.getHistory(2)).toEqual([]);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
});
it('conserve les résultats figés des joueurs classés', async () => {
    (SeasonFinalStandingModel.findAll as jest.Mock).mockResolvedValue([{ seasonId: 1, finalRank: 3, participants: 10, stats: { correct: 5 } }]);
    expect(await seasonsService.getHistory(2)).toEqual([{ seasonCode: 'beta', seasonName: 'Saison Bêta', rank: 3, participants: 10, stats: { correct: 5 } }]);
    expect(sequelize.query).not.toHaveBeenCalled();
});
