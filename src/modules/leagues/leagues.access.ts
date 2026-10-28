import { NextFunction, Request, Response } from "express";
import { httpErrors } from "../../common/errors/http";
import { LeagueMemberModel } from "../../database/models";

export async function requireLeagueMember(req: Request, _res: Response, next: NextFunction) {
    try {
        const leagueId = Number(req.params.leagueId);
        if (!Number.isSafeInteger(leagueId) || leagueId <= 0) return next(httpErrors.badRequest("Invalid league ID"));
        const member = await LeagueMemberModel.findOne({ where: { leagueId, userId: req.user!.id } });
        if (!member) return next(httpErrors.notFound("League not found"));
        next();
    } catch (error) { next(error); }
}
