import { Request, Response, NextFunction } from "express";
import { OpenF1Service } from "./openf1.service";
import { RaceSessionsRepository } from "../raceSessions/raceSessions.repository";
import { ChatChannelsService } from "../chatChannels/chatChannels.service";

export class OpenF1Controller {
    constructor(
        private readonly service = new OpenF1Service(),
        private readonly raceSessionsRepo = new RaceSessionsRepository(),
        private readonly chatChannelsService = new ChatChannelsService(),
    ) {}

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
            if (req.params.sessionKey === "latest") {
                const session = await this.service.getLatestSession();
                res.json({ status: "ok", session });
                return;
            }
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
            const sk = req.params.sessionKey === "latest" ? "latest" : Number(req.params.sessionKey);
            const drivers = await this.service.getDrivers(sk);
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

    getWeather = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const weather = await this.service.getWeather(Number(req.params.sessionKey));
            res.json({ status: "ok", weather });
        } catch (e) {
            next(e);
        }
    };

    getPitStops = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pit = await this.service.getPitStops(Number(req.params.sessionKey));
            res.json({ status: "ok", pit });
        } catch (e) {
            next(e);
        }
    };

    getStints = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const stints = await this.service.getStints(Number(req.params.sessionKey));
            res.json({ status: "ok", stints });
        } catch (e) {
            next(e);
        }
    };

    getTeamRadio = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const radio = await this.service.getTeamRadio(Number(req.params.sessionKey));
            res.json({ status: "ok", radio });
        } catch (e) {
            next(e);
        }
    };

    getLatestLocations = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sk = req.params.sessionKey === "latest" ? "latest" : Number(req.params.sessionKey);
            const locations = await this.service.getLocations(sk);
            res.json({ status: "ok", locations });
        } catch (e) {
            next(e);
        }
    };

    getLatestPositions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sk = req.params.sessionKey === "latest" ? "latest" : Number(req.params.sessionKey);
            const positions = await this.service.getLatestPositions(sk);
            res.json({ status: "ok", positions });
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

    // ── Drivers ───────────────────────────────────────────────────────────────

    listDrivers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const params = {
                session_key:  req.query.session_key ? Number(req.query.session_key) : undefined,
                name_acronym: req.query.name_acronym as string | undefined,
            };
            const drivers = await this.service.listDrivers(params);
            res.json({ status: "ok", drivers });
        } catch (e) {
            next(e);
        }
    };

    getDriverByNumber = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionKey = req.query.session_key ? Number(req.query.session_key) : undefined;
            const driver = await this.service.getDriverByNumber(Number(req.params.driverNumber), sessionKey);
            if (!driver) {
                res.status(404).json({ status: "error", message: "Driver not found" });
                return;
            }
            res.json({ status: "ok", driver });
        } catch (e) {
            next(e);
        }
    };

    getSessionTeams = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sk = req.params.sessionKey === "latest" ? "latest" : Number(req.params.sessionKey);
            const teams = await this.service.getTeamsForSession(sk);
            res.json({ status: "ok", teams });
        } catch (e) {
            next(e);
        }
    };

    // ── Teams ─────────────────────────────────────────────────────────────────

    listTeams = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionKey = req.query.session_key ? Number(req.query.session_key) : undefined;
            const teams = await this.service.listTeams(sessionKey);
            res.json({ status: "ok", teams });
        } catch (e) {
            next(e);
        }
    };

    // ── Sub-routes by driver ──────────────────────────────────────────────────

    getDriverPit = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pit = await this.service.getPitStopsByDriver(
                Number(req.params.sessionKey),
                Number(req.params.driverNumber),
            );
            res.json({ status: "ok", pit });
        } catch (e) { next(e); }
    };

    getDriverStints = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const stints = await this.service.getStintsByDriver(
                Number(req.params.sessionKey),
                Number(req.params.driverNumber),
            );
            res.json({ status: "ok", stints });
        } catch (e) { next(e); }
    };

    getDriverTeamRadio = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const radio = await this.service.getTeamRadioByDriver(
                Number(req.params.sessionKey),
                Number(req.params.driverNumber),
            );
            res.json({ status: "ok", radio });
        } catch (e) { next(e); }
    };

    // ── Chat channel by OpenF1 session key ───────────────────────────────────

    getSessionChatChannel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionKey = Number(req.params.sessionKey);
            let raceSession = await this.raceSessionsRepo.findByExternalId(sessionKey);

            if (!raceSession) {
                const openf1Session = await this.service.getSessionByKey(sessionKey);
                if (!openf1Session) {
                    res.status(404).json({ status: "error", message: "Session not found on OpenF1." });
                    return;
                }
                raceSession = await this.raceSessionsRepo.create({
                    idCourseExternal: openf1Session.session_key,
                    name: openf1Session.session_name,
                    type: openf1Session.session_name,
                    dateStart: openf1Session.date_start ? new Date(openf1Session.date_start) : null,
                });
            }

            const channel = await this.chatChannelsService.ensureLiveChannelForSession(raceSession.id, raceSession.name);
            res.json({ status: "ok", channel });
        } catch (e) {
            next(e);
        }
    };

    // ── Sub-routes by team ────────────────────────────────────────────────────

    getTeamPit = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pit = await this.service.getPitStopsByTeam(
                Number(req.params.sessionKey),
                req.params.teamName,
            );
            res.json({ status: "ok", pit });
        } catch (e) { next(e); }
    };

    getTeamStints = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const stints = await this.service.getStintsByTeam(
                Number(req.params.sessionKey),
                req.params.teamName,
            );
            res.json({ status: "ok", stints });
        } catch (e) { next(e); }
    };

    getTeamTeamRadio = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const radio = await this.service.getTeamRadioByTeam(
                Number(req.params.sessionKey),
                req.params.teamName,
            );
            res.json({ status: "ok", radio });
        } catch (e) { next(e); }
    };
}
