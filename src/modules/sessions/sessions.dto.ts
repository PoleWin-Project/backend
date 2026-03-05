import { z } from "zod";

const SESSION_TYPES = ["Race", "Qualifying", "Sprint", "Sprint Qualifying", "Practice 1", "Practice 2", "Practice 3"] as const;

export const CreateSessionDto = z.object({
    idCourseExternal: z.number().int().positive().optional(),
    name:             z.string().min(1).max(200),
    type:             z.enum(SESSION_TYPES),
    dateStart:        z.iso.datetime().optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionDto>;

export const UpdateSessionDto = CreateSessionDto.partial();
export type UpdateSessionInput = z.infer<typeof UpdateSessionDto>;

export const ListSessionsQueryDto = z.object({
    type:   z.string().optional(),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export type ListSessionsQuery = z.infer<typeof ListSessionsQueryDto>;
