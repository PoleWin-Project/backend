import { httpErrors } from "../../common/errors/http";
import { UsersRepository } from "./users.repository";
import {
    AdminUpdateUserInput,
    ListUsersQuery,
    UpdateMeInput,
} from "./users.dto";

export class UsersService {
    constructor(private readonly repo = new UsersRepository()) {}

    async getMe(userId: string) {
        const user = await this.repo.findById(userId);
        if (!user) throw httpErrors.notFound("User not found");
        return user;
    }

    async getPublicProfile(userId: string) {
        const user = await this.repo.findPublicById(userId);
        if (!user) throw httpErrors.notFound("Public profile not found");
        return user;
    }

    async listUsers(query: ListUsersQuery) {
        const { rows, count } = await this.repo.list(query);
        return {
            items: rows,
            total: count,
            limit: query.limit,
            offset: query.offset,
        };
    }

    async updateMe(userId: string, input: UpdateMeInput) {
        if (input.username) {
            const exists = await this.repo.usernameExists(
                input.username,
                userId
            );
            if (exists) throw httpErrors.conflict("Username already used");
        }

        const updated = await this.repo.updateMe(userId, input);
        if (!updated) throw httpErrors.notFound("User not found");
        return updated;
    }

    async adminUpdateUser(userId: string, input: AdminUpdateUserInput) {
        const updated = await this.repo.adminUpdateUser(userId, input);
        if (!updated) throw httpErrors.notFound("User not found");
        return updated;
    }
}
