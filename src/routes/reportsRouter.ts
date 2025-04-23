import express from "express";
import { reportsOverview } from "../controllers/reports/reportsController";

const router = express.Router();

router.get("/overview", reportsOverview);

export default router;
