import { Router } from "express";
import {
  getAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomationActive,
  executeAutomation,
  getAvailableModules,
} from "../controllers/automation/automationController";

import { getNodeTypes } from "../controllers/automation/nodeTypesController";

const router: Router = Router();

// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros
// Obtener tipos de nodos disponibles
router.get("/nodes/types", getNodeTypes);

// Obtener módulos y eventos disponibles
router.get("/modules", getAvailableModules);

// Obtener todas las automatizaciones (con filtros)
router.get("/", getAutomations);

// DESPUÉS vienen las rutas con parámetros
// Obtener una sola automatización por ID
router.get("/:id", getAutomation);

// Crear nueva automatización
router.post("/", createAutomation);

// Actualizar una automatización existente
router.patch("/:id", updateAutomation);

// Eliminar una automatización
router.delete("/:id", deleteAutomation);

// Activar o desactivar una automatización
router.post("/:id/toggle", toggleAutomationActive);

// Ejecutar manualmente una automatización
router.post("/:id/execute", executeAutomation);

export default router;
