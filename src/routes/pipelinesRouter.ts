import { Router } from "express";
import {
  getPipelines,
  createPipeline,
} from "../controllers/pipelines/pipelinesController";

const router: Router = Router();

router.get("/", getPipelines);
router.post("/", createPipeline);

export default router;
