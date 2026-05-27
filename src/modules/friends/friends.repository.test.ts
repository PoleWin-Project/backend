const mockFriendRequestModel = {
    findOne:         jest.fn(),
    findByPk:        jest.fn(),
    create:          jest.fn(),
    findAll:         jest.fn(),
    count:           jest.fn(),
};

jest.mock("../../database/models", () => ({
    FriendRequestModel: mockFriendRequestModel,
    UserModel:          {},
    ProfileModel:       {},
}));

import { FriendsRepository } from "./friends.repository";

describe("FriendsRepository", () => {
    let repo: FriendsRepository;

    beforeEach(() => {
        repo = new FriendsRepository();
    });

    it("findBetween — cherche une relation entre deux utilisateurs", async () => {
        mockFriendRequestModel.findOne.mockResolvedValue({ id: 1 });

        const result = await repo.findBetween(1, 2);

        expect(mockFriendRequestModel.findOne).toHaveBeenCalled();
        expect(result).toEqual({ id: 1 });
    });

    it("findById — retourne la requête par id avec include", async () => {
        const fakeReq = { id: 1 };
        mockFriendRequestModel.findByPk.mockResolvedValue(fakeReq);

        const result = await repo.findById(1);

        expect(mockFriendRequestModel.findByPk).toHaveBeenCalledWith(
            1,
            expect.objectContaining({ include: expect.any(Array) }),
        );
        expect(result).toBe(fakeReq);
    });

    it("create — crée une requête d'ami pending", async () => {
        const fakeReq = { id: 1, senderId: 1, receiverId: 2, status: "pending" };
        mockFriendRequestModel.create.mockResolvedValue(fakeReq);

        const result = await repo.create(1, 2);

        expect(mockFriendRequestModel.create).toHaveBeenCalledWith({
            senderId: 1, receiverId: 2, status: "pending",
        });
        expect(result).toBe(fakeReq);
    });

    it("updateStatus — met à jour le statut si la requête existe", async () => {
        const fakeUpdate = jest.fn().mockResolvedValue({ id: 1, status: "accepted" });
        mockFriendRequestModel.findByPk.mockResolvedValue({ id: 1, update: fakeUpdate });

        const result = await repo.updateStatus(1, "accepted");

        expect(fakeUpdate).toHaveBeenCalledWith({ status: "accepted" });
        expect(result).toEqual({ id: 1, status: "accepted" });
    });

    it("updateStatus — retourne null si non trouvé", async () => {
        mockFriendRequestModel.findByPk.mockResolvedValue(null);

        const result = await repo.updateStatus(99, "accepted");

        expect(result).toBeNull();
    });

    it("delete — supprime et retourne true si trouvé", async () => {
        const fakeDestroy = jest.fn().mockResolvedValue(undefined);
        mockFriendRequestModel.findByPk.mockResolvedValue({ id: 1, destroy: fakeDestroy });

        const result = await repo.delete(1);

        expect(fakeDestroy).toHaveBeenCalled();
        expect(result).toBe(true);
    });

    it("delete — retourne false si non trouvé", async () => {
        mockFriendRequestModel.findByPk.mockResolvedValue(null);

        const result = await repo.delete(99);

        expect(result).toBe(false);
    });

    it("listIncoming — retourne les demandes reçues en attente", async () => {
        const fakeReqs = [{ id: 1 }];
        mockFriendRequestModel.findAll.mockResolvedValue(fakeReqs);

        const result = await repo.listIncoming(2);

        expect(mockFriendRequestModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ receiverId: 2 }) }),
        );
        expect(result).toBe(fakeReqs);
    });

    it("listOutgoing — retourne les demandes envoyées en attente", async () => {
        const fakeReqs = [{ id: 2 }];
        mockFriendRequestModel.findAll.mockResolvedValue(fakeReqs);

        const result = await repo.listOutgoing(1);

        expect(mockFriendRequestModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ senderId: 1 }) }),
        );
        expect(result).toBe(fakeReqs);
    });

    it("listFriends — retourne les amis acceptés", async () => {
        const fakeReqs = [{ id: 1 }, { id: 2 }];
        mockFriendRequestModel.findAll.mockResolvedValue(fakeReqs);

        const result = await repo.listFriends(1);

        expect(mockFriendRequestModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ status: "accepted" }) }),
        );
        expect(result).toBe(fakeReqs);
    });

    it("areFriends — retourne la relation si amis", async () => {
        const fakeReq = { id: 1 };
        mockFriendRequestModel.findOne.mockResolvedValue(fakeReq);

        const result = await repo.areFriends(1, 2);

        expect(result).toBe(fakeReq);
    });

    it("countFriends — retourne le nombre d'amis", async () => {
        mockFriendRequestModel.count.mockResolvedValue(5);

        const result = await repo.countFriends(1);

        expect(result).toBe(5);
        expect(mockFriendRequestModel.count).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ status: "accepted" }) }),
        );
    });
});
