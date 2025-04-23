import { Router } from "express";
import { createDeal } from "../controllers/api/DealsApi";

const router: Router = Router();

router.post("/", createDeal);

export default router;
