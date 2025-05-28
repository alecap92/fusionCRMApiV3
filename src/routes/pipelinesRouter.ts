import { Router } from "express";
import {
  getPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
} from "../controllers/pipelines/pipelinesController";

const router: Router = Router();

router.get("/", getPipelines);
router.post("/", createPipeline);
router.put("/:id", updatePipeline);
router.delete("/:id", deletePipeline);

export default router;
