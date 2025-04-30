import express from "express";
import {
  getStrategies,
  getStrategy,
  createStrategy,
  updateStrategy,
  deleteStrategy,
} from "../controllers/strategy/strategyController";

const router = express.Router();

// Rutas para manejar estrategias
router.get("/", getStrategies);
router.get("/:id", getStrategy);
router.post("/", createStrategy);
router.put("/:id", updateStrategy);
router.delete("/:id", deleteStrategy);

export default router;
