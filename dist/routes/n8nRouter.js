"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const n8nController_1 = require("../controllers/n8n/n8nController");
const router = (0, express_1.Router)();
// 📥 Obtener todas las automatizaciones n8n de la organización
router.get("/", n8nController_1.getN8nAutomations);
// 🔍 Obtener una automatización n8n específica por ID
router.get("/:id", n8nController_1.getN8nAutomation);
// ➕ Crear nueva automatización n8n
router.post("/", n8nController_1.createN8nAutomation);
// ✏️ Actualizar una automatización n8n
router.put("/:id", n8nController_1.updateN8nAutomation);
// ❌ Eliminar una automatización n8n
router.delete("/:id", n8nController_1.deleteN8nAutomation);
// 🚀 Ejecutar automatización n8n con contexto de conversación
router.post("/:automationId/execute", n8nController_1.executeN8nAutomation);
exports.default = router;
