"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const integrationController_1 = require("../controllers/integrations/integrationController");
const router = (0, express_1.Router)();
// 📥 Obtener todas las integraciones para una organización
router.get("/", integrationController_1.getIntegrations);
// 🔍 Obtener una integración específica por ID
router.get("/:id", integrationController_1.getIntegration);
// ➕ Crear nueva integración
router.post("/", integrationController_1.createIntegration);
// ✏️ Actualizar una integración
router.put("/:id", integrationController_1.updateIntegration);
// ❌ Eliminar una integración
router.delete("/:id", integrationController_1.deleteIntegration);
exports.default = router;
