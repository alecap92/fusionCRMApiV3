import { Router } from "express";
import {
  getIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
} from "../controllers/integrations/integrationController";

const router: Router = Router();

// 📥 Obtener todas las integraciones para una organización
router.get("/", getIntegrations);

// 🔍 Obtener una integración específica por ID
router.get("/:id", getIntegration);

// ➕ Crear nueva integración
router.post("/", createIntegration);

// ✏️ Actualizar una integración
router.put("/:id", updateIntegration);

// ❌ Eliminar una integración
router.delete("/:id", deleteIntegration);

export default router;
