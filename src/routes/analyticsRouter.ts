import { Router } from "express";
import { getMarketingDashboard } from "../controllers/analytics/analyticsController";

const router: Router = Router();

router.get("/", getMarketingDashboard);

export default router;
