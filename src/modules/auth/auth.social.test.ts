import { UniqueConstraintError } from 'sequelize';
import { UserModel, ProfileModel } from '../../database/models';
import { sequelize } from '../../database/sequelize';
import { processSocialLogin } from './auth.social';

jest.mock('../../database/models', () => ({
    UserModel: { findOne: jest.fn(), create: jest.fn() },
    ProfileModel: { create: jest.fn() },
}));
jest.mock('../../database/sequelize', () => ({
    sequelize: { transaction: jest.fn() },
}));
jest.mock('../../common/utils/password', () => ({ hashPassword: jest.fn().mockResolvedValue('hash') }));
jest.mock('../../common/utils/jwt', () => ({
    signAccessToken: jest.fn().mockReturnValue('access'),
    signRefreshToken: jest.fn().mockReturnValue('refresh'),
}));

const findOne = UserModel.findOne as jest.Mock;
const createUser = UserModel.create as jest.Mock;
const createProfile = ProfileModel.create as jest.Mock;
const transaction = sequelize.transaction as jest.Mock;

describe('processSocialLogin', () => {
    beforeEach(() => {
        findOne.mockResolvedValue(null);
        transaction.mockImplementation(async (callback) => callback({}));
        createProfile.mockResolvedValue({});
    });

    it('retries a username collision in a fresh transaction', async () => {
        const user = {
            id: 1,
            email: 'review@example.com',
            username: 'AppReview_unique',
            role: 'user',
            isEmailVerified: true,
            profile: { points: 0 },
            update: jest.fn().mockResolvedValue(undefined),
            reload: jest.fn().mockResolvedValue(undefined),
        };
        createUser
            .mockRejectedValueOnce(new UniqueConstraintError({ fields: { username: 'AppReview' }, errors: [] }))
            .mockResolvedValueOnce(user);

        const result = await processSocialLogin('apple', 'apple-sub', user.email, 'App Review');

        expect(result.ok).toBe(true);
        expect(transaction).toHaveBeenCalledTimes(2);
        expect(createUser).toHaveBeenCalledTimes(2);
        const firstUsername = createUser.mock.calls[0][0].username;
        const secondUsername = createUser.mock.calls[1][0].username;
        expect(firstUsername).toMatch(/^AppReview_[0-9a-f]{10}$/);
        expect(secondUsername).toMatch(/^AppReview_[0-9a-f]{10}$/);
        expect(createProfile).toHaveBeenCalledWith(
            { userId: 1, displayName: secondUsername },
            expect.objectContaining({ transaction: expect.anything() })
        );
    });

    it('does not retry a different unique constraint', async () => {
        createUser.mockRejectedValueOnce(
            new UniqueConstraintError({ fields: { email: 'review@example.com' }, errors: [] })
        );

        await expect(processSocialLogin('apple', 'apple-sub', 'review@example.com', 'App Review'))
            .rejects.toBeInstanceOf(UniqueConstraintError);
        expect(transaction).toHaveBeenCalledTimes(1);
    });
});
