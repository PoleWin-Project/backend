import { z } from "zod";

export const ListRaceSessionsQueryDto = z.object({
    q: z.string().max(120).optional(),
    type: z.string().max(80).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export const CreateRaceSessionDto = z.object({
    idCourseExternal: z.number().int().positive().nullable().optional(),
    name: z.string().min(1).max(255),
    type: z.string().min(1).max(80),
    dateStart: z.coerce.date().nullable().optional(),
});

export const UpdateRaceSessionDto = CreateRaceSessionDto.partial();

export const ImportOpenF1ParamsDto = z.object({
    sessionKey: z.coerce.number().int().positive(),
});

export type ListRaceSessionsQuery = z.infer<typeof ListRaceSessionsQueryDto>;
export type CreateRaceSessionInput = z.infer<typeof CreateRaceSessionDto>;
export type UpdateRaceSessionInput = z.infer<typeof UpdateRaceSessionDto>;
export type ImportOpenF1Params = z.infer<typeof ImportOpenF1ParamsDto>;
