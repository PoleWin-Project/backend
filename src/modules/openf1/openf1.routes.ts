import { Router } from "express";
import { OpenF1Controller } from "./openf1.controller";
import * as live from "./openf1.live.controller";

const router = Router();
const ctrl = new OpenF1Controller();

router.get("/openf1/calendar",                          ctrl.getCalendar);
router.get("/openf1/upcoming",                          ctrl.getUpcomingSessions);
router.get("/openf1/next-session",                      ctrl.getNextSession);
router.get("/openf1/meetings/latest",                   ctrl.getLatestMeeting);
router.get("/openf1/standings/drivers",        ctrl.getDriverStandings);
router.get("/openf1/standings/teams",          ctrl.getTeamStandings);
router.get("/openf1/meetings",                          ctrl.getMeetings);
router.get("/openf1/sessions/latest",                   ctrl.getLatestSession);
router.get("/openf1/sessions/:sessionKey/drivers",      ctrl.getDrivers);
router.get("/openf1/sessions/:sessionKey/results",      ctrl.getSessionResults);
router.get("/openf1/sessions/:sessionKey/race-control", ctrl.getRaceControl);
router.get("/openf1/sessions/:sessionKey",              ctrl.getSession);
router.get("/openf1/sessions",                          ctrl.getSessions);

router.get("/openf1/live/session",                      live.liveSession);
router.get("/openf1/live/race-control",                 live.liveRaceControl);
router.get("/openf1/live/positions",                    live.livePositions);
router.get("/openf1/live/laps",                         live.liveLaps);
router.get("/openf1/live/intervals",                    live.liveIntervals);

export default router;
