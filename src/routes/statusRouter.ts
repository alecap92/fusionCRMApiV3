import { Router } from "express";
import {
  createStatus,
  editStatus,
  getStatus,
  editStatusByPipeline,
} from "../controllers/status/statusController";

const router: Router = Router();

router.get("/", getStatus);
router.post("/", createStatus);
router.put("/:id", editStatus);
router.put("/pipeline/:id", editStatusByPipeline);

export default router;
