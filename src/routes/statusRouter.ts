import { Router } from "express";
import {
  createStatus,
  editStatus,
  getStatus,
  editStatusByPipeline,
  deleteStatus,
  getStatusDealsCount,
} from "../controllers/status/statusController";

const router: Router = Router();

router.get("/", getStatus);
router.post("/", createStatus);
router.put("/:id", editStatus);
router.delete("/:id", deleteStatus);
router.get("/:id/deals-count", getStatusDealsCount);
router.put("/pipeline/:id", editStatusByPipeline);

export default router;
