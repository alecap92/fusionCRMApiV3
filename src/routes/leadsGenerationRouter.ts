import { Router } from "express";
import { getGoogleMaps } from "../controllers/leadsGeneration/leadsGenerationController";

const router: Router = Router();

router.get("/google-maps", getGoogleMaps);

export default router;
