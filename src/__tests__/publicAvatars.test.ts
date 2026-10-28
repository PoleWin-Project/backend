jest.mock('../modules/paddock/paddock.service', () => ({
    paddockService: { appearances: jest.fn() },
}));
import { paddockService } from '../modules/paddock/paddock.service';
import { withPublicAvatars } from '../modules/paddock/publicAvatars';

beforeEach(() => jest.clearAllMocks());

test('enriches nested friends, messages and game ranks in one batch without mutating input', async () => {
    const cosmetics = { helmet: { code: 'helmet_antonelli' }, suit: null };
    (paddockService.appearances as jest.Mock).mockResolvedValue(new Map([[7, cosmetics]]));
    const input = {
        friends: [{ sender: { id: 7, username: 'Pilote' } }],
        conversations: [{ partner: { id: 7, username: 'Pilote' } }],
        messages: [{ id: 99, sender: { id: 7, username: 'Pilote' } }],
        leaderboard: [{ userId: 7, rank: 1, displayName: 'Pilote' }],
    };
    const result: any = await withPublicAvatars(input);
    expect(paddockService.appearances).toHaveBeenCalledTimes(1);
    expect(result.friends[0].sender.cosmetics).toEqual(cosmetics);
    expect(result.conversations[0].partner.cosmetics).toEqual(cosmetics);
    expect(result.messages[0].sender.cosmetics).toEqual(cosmetics);
    expect(result.leaderboard[0].cosmetics).toEqual(cosmetics);
    expect(input.friends[0].sender).not.toHaveProperty('cosmetics');
    expect(result.messages[0]).not.toHaveProperty('cosmetics');
});

test('does not query equipment for empty responses or non-identity IDs', async () => {
    expect(await withPublicAvatars(null)).toBeNull();
    expect(await withPublicAvatars([])).toEqual([]);
    expect(await withPublicAvatars({ id: 3, senderId: 7, content: 'test' })).toEqual({ id: 3, senderId: 7, content: 'test' });
    expect(paddockService.appearances).not.toHaveBeenCalled();
});
