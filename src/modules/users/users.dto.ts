import { z } from "zod";

export const UserIdParamDto = z.object({
    id: z.string().regex(/^\d+$/, "id must be a bigint string"),
});

export const UpdateMeDto = z.object({
    username: z.string().min(3).max(50).optional(),

    profile: z
        .object({
            displayName: z.string().max(100).optional().nullable(),
            avatarUrl: z.string().url().max(500).optional().nullable(),
            bio: z.string().max(2000).optional().nullable(),
            favoriteTeamCode: z.string().max(50).optional().nullable(),
            favoriteDriverCode: z.string().max(50).optional().nullable(),
            isProfilePublic: z.boolean().optional(),
        })
        .optional(),
});

export const AdminUpdateUserDto = z.object({
    isEmailVerified: z.boolean().optional(),
});

export const ListUsersQueryDto = z.object({
    q: z.string().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export type UpdateMeInput = z.infer<typeof UpdateMeDto>;
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserDto>;
export type ListUsersQuery = z.infer<typeof ListUsersQueryDto>;
