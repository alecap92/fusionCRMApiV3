"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const automationController_1 = require("../controllers/automation/automationController");
const nodeTypesController_1 = require("../controllers/automation/nodeTypesController");
const router = (0, express_1.Router)();
// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros
// Obtener tipos de nodos disponibles
router.get("/nodes/types", nodeTypesController_1.getNodeTypes);
// Obtener módulos y eventos disponibles
router.get("/modules", nodeTypesController_1.getAvailableModules);
// Obtener todas las automatizaciones (con filtros)
router.get("/", automationController_1.getAutomations);
// DESPUÉS vienen las rutas con parámetros
// Obtener una sola automatización por ID
router.get("/:id", automationController_1.getAutomation);
// Crear nueva automatización
router.post("/", automationController_1.createAutomation);
// Actualizar una automatización existente
router.patch("/:id", automationController_1.updateAutomation);
// Eliminar una automatización
router.delete("/:id", automationController_1.deleteAutomation);
// Activar o desactivar una automatización
router.post("/:id/toggle", automationController_1.toggleAutomationActive);
// Ejecutar manualmente una automatización
router.post("/:id/execute", automationController_1.executeAutomation);
exports.default = router;
