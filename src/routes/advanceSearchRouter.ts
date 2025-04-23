import { Router } from "express";
import { advancedSearch } from "../controllers/advancedSearch/AdvancedSearch";

const router: Router = Router();

router.post("/", advancedSearch);

export default router;
