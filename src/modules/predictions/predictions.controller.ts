import { Request, Response, NextFunction } from "express";
import { PredictionsService } from "./predictions.service";

export class PredictionsController {
    constructor(private readonly service = new PredictionsService()) {}

    getBySession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const predictions = await this.service.getBySession(Number(req.params.sessionId));
            res.json({ status: "ok", predictions });
        } catch (e) { next(e); }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const prediction = await this.service.getById(Number(req.params.predictionId));
            res.json({ status: "ok", prediction });
        } catch (e) { next(e); }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const prediction = await this.service.create(Number(req.params.sessionId), req.body);
            res.status(201).json({ status: "ok", prediction });
        } catch (e) { next(e); }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const prediction = await this.service.update(Number(req.params.predictionId), req.body);
            res.json({ status: "ok", prediction });
        } catch (e) { next(e); }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.delete(Number(req.params.predictionId));
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };

    placePronostic = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pronostic = await this.service.placePronostic(
                req.user!.id,
                Number(req.params.predictionId),
                req.body,
            );
            res.status(201).json({ status: "ok", pronostic });
        } catch (e) { next(e); }
    };

    updatePronostic = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pronostic = await this.service.updatePronostic(
                req.user!.id,
                Number(req.params.predictionId),
                req.body,
            );
            res.json({ status: "ok", pronostic });
        } catch (e) { next(e); }
    };

    cancelPronostic = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.cancelPronostic(req.user!.id, Number(req.params.predictionId));
            res.json({ status: "ok" });
        } catch (e) { next(e); }
    };

    myPronostic = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pronostic = await this.service.getMyPronostic(
                req.user!.id,
                Number(req.params.predictionId),
            );
            if (!pronostic) {
                res.status(404).json({ status: "error", message: "No pronostic found" });
                return;
            }
            res.json({ status: "ok", pronostic });
        } catch (e) { next(e); }
    };

    myPronostics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.listMyPronostics(req.user!.id, req.query as any);
            res.json({ status: "ok", ...result });
        } catch (e) { next(e); }
    };

    myPronosticsForSession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pronostics = await this.service.getMyPronosticsForSession(
                req.user!.id,
                Number(req.params.sessionId),
            );
            res.json({ status: "ok", pronostics });
        } catch (e) { next(e); }
    };

    allPronostics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pronostics = await this.service.getAllPronosticsForPrediction(
                Number(req.params.predictionId),
            );
            res.json({ status: "ok", pronostics });
        } catch (e) { next(e); }
    };

    resolve = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.resolve(Number(req.params.predictionId), req.body);
            res.json({ status: "ok", ...result });
        } catch (e) { next(e); }
    };

    sync = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { SyncService } = await import("./sync.service");
            const syncService = new SyncService();
            const year = req.body.year || new Date().getFullYear();
            const result = await syncService.syncSeason(year);
            res.json({ status: "ok", ...result });
        } catch (e) { next(e); }
    };
}
