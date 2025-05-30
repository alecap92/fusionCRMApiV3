import { Router } from "express";
import { verifyToken } from "../middlewares/authMiddleware";
import {
  getAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomationStatus,
  executeAutomation,
  getExecutionHistory,
} from "../controllers/automationSystemController";

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas CRUD básicas
router.get("/", getAutomations);
router.get("/:id", getAutomation);
router.post("/", createAutomation);
router.put("/:id", updateAutomation);
router.delete("/:id", deleteAutomation);

// Rutas de funcionalidad específica
router.patch("/:id/toggle", toggleAutomationStatus);
router.post("/:id/execute", executeAutomation);
router.get("/:id/executions", getExecutionHistory);

export default router;
