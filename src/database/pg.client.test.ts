const mockConnect  = jest.fn();
const mockQuery    = jest.fn();
const mockEnd      = jest.fn();

jest.mock("pg", () => ({
    Client: jest.fn().mockImplementation(() => ({
        connect: mockConnect,
        query:   mockQuery,
        end:     mockEnd,
    })),
}));

// Reset module between tests so dbClient state is clean
beforeEach(() => {
    jest.resetModules();
    mockConnect.mockReset();
    mockQuery.mockReset();
});

describe("pg.client — connectToDatabase", () => {
    it("se connecte et retourne le client", async () => {
        mockConnect.mockResolvedValue(undefined);

        const { connectToDatabase, getDbClient } = await import("./pg.client");
        const client = await connectToDatabase();

        expect(client).not.toBeNull();
        expect(mockConnect).toHaveBeenCalled();
        expect(getDbClient()).toBe(client);
    });

    it("retourne null si la connexion échoue", async () => {
        mockConnect.mockRejectedValue(new Error("connection refused"));

        const { connectToDatabase, getDbClient } = await import("./pg.client");
        const client = await connectToDatabase();

        expect(client).toBeNull();
        expect(getDbClient()).toBeNull();
    });

    it("retourne null si la connexion échoue avec une erreur non-Error", async () => {
        mockConnect.mockRejectedValue("string error");

        const { connectToDatabase, getDbClient } = await import("./pg.client");
        const client = await connectToDatabase();

        expect(client).toBeNull();
        expect(getDbClient()).toBeNull();
    });

    it("retourne null si DATABASE_URL n'est pas défini", async () => {
        jest.doMock("../config/env", () => ({
            env: { databaseUrl: undefined },
        }));

        const { connectToDatabase } = await import("./pg.client");
        const client = await connectToDatabase();

        expect(client).toBeNull();
        expect(mockConnect).not.toHaveBeenCalled();
    });
});
