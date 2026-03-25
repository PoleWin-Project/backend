import { Request, Response, NextFunction } from "express";
import { OpenF1Service } from "./openf1.service";

export class OpenF1Controller {
    constructor(private readonly service = new OpenF1Service()) {}

    getMeetings = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const year = req.query.year ? Number(req.query.year) : undefined;
            const country_code = req.query.country_code as string | undefined;
            const meetings = await this.service.getMeetings({ year, country_code });
            res.json({ status: "ok", meetings });
        } catch (e) {
            next(e);
        }
    };

    getLatestMeeting = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const meeting = await this.service.getLatestMeeting();
            res.json({ status: "ok", meeting });
        } catch (e) {
            next(e);
        }
    };

    getSessions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const meeting_key  = req.query.meeting_key  ? Number(req.query.meeting_key)  : undefined;
            const session_type = req.query.session_type as string | undefined;
            const year         = req.query.year         ? Number(req.query.year)         : undefined;
            const sessions = await this.service.getSessions({ meeting_key, session_type, year });
            res.json({ status: "ok", sessions });
        } catch (e) {
            next(e);
        }
    };

    getLatestSession = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.getLatestSession();
            res.json({ status: "ok", session });
        } catch (e) {
            next(e);
        }
    };

    getSession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.getSessionByKey(Number(req.params.sessionKey));
            if (!session) {
                res.status(404).json({ status: "error", message: "Session not found" });
                return;
            }
            res.json({ status: "ok", session });
        } catch (e) {
            next(e);
        }
    };

    getDrivers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const drivers = await this.service.getDrivers(Number(req.params.sessionKey));
            res.json({ status: "ok", drivers });
        } catch (e) {
            next(e);
        }
    };

    getRaceControl = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const events = await this.service.getRaceControl(Number(req.params.sessionKey));
            res.json({ status: "ok", events });
        } catch (e) {
            next(e);
        }
    };

    getCalendar = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const year = req.query.year ? Number(req.query.year) : undefined;
            const meetings = await this.service.getCalendar(year);
            res.json({ status: "ok", meetings });
        } catch (e) {
            next(e);
        }
    };

    getUpcomingSessions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : 10;
            const sessions = await this.service.getUpcomingSessions(limit);
            res.json({ status: "ok", sessions });
        } catch (e) {
            next(e);
        }
    };

    getNextSession = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await this.service.getNextSession();
            res.json({ status: "ok", session });
        } catch (e) {
            next(e);
        }
    };

    getSessionResults = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const results = await this.service.getSessionResults(Number(req.params.sessionKey));
            res.json({ status: "ok", results });
        } catch (e) {
            next(e);
        }
    };

    getDriverStandings = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const year = req.query.year ? Number(req.query.year) : undefined;
            const standings = await this.service.getDriverStandings(year);
            res.json({ status: "ok", standings });
        } catch (e) {
            next(e);
        }
    };

    getTeamStandings = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const year = req.query.year ? Number(req.query.year) : undefined;
            const standings = await this.service.getTeamStandings(year);
            res.json({ status: "ok", standings });
        } catch (e) {
            next(e);
        }
    };
}
