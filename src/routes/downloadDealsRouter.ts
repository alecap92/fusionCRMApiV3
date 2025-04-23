import { Router } from "express";
import { downloadDeals } from "../controllers/api/DownloadDeals";

const router: Router = Router();

router.get("/", downloadDeals);

export default router;
