import { Router } from "express";
import {
  getN8nAutomations,
  getN8nAutomation,
  createN8nAutomation,
  updateN8nAutomation,
  deleteN8nAutomation,
  executeN8nAutomation,
} from "../controllers/n8n/n8nController";

const router: Router = Router();

// 📥 Obtener todas las automatizaciones n8n de la organización
router.get("/", getN8nAutomations);

// 🔍 Obtener una automatización n8n específica por ID
router.get("/:id", getN8nAutomation);

// ➕ Crear nueva automatización n8n
router.post("/", createN8nAutomation);

// ✏️ Actualizar una automatización n8n
router.put("/:id", updateN8nAutomation);

// ❌ Eliminar una automatización n8n
router.delete("/:id", deleteN8nAutomation);

// 🚀 Ejecutar automatización n8n con contexto de conversación
router.post("/:automationId/execute", executeN8nAutomation);

export default router;
