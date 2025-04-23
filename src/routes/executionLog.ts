// src/routes/executionLog.ts
import { Router } from "express";
import {
  getExecutionLogs,
  getExecutionDetail,
  getExecutionStats,
  getExecutionError,
} from "../controllers/execution/executionLogController";

const router: Router = Router();

// Obtener logs de ejecución (con filtros)
router.get("/", getExecutionLogs);

// Obtener estadísticas
router.get("/stats", getExecutionStats);

// Obtener detalle de una ejecución
router.get("/:id", getExecutionDetail);

// Obtener detalles de error
router.get("/:id/error", getExecutionError);

export default router;
