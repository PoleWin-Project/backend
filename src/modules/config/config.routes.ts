import { Router } from "express";
import { env } from "../../config/env";

/**
 * Configuration publique lue par l'application au démarrage : lui permet d'afficher
 * le bon modèle (championnat sans mise vs ancien modèle) et l'état de maintenance.
 */
const router = Router();

router.get("/config", (_req, res) => {
    res.json({
        status: "ok",
        scoringModel: env.scoringModel,
        predictionsFrozen: env.predictionsFrozen,
    });
});

export default router;
