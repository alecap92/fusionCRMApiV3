"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/executionLog.ts
const express_1 = require("express");
const executionLogController_1 = require("../controllers/execution/executionLogController");
const router = (0, express_1.Router)();
// Obtener logs de ejecución (con filtros)
router.get("/", executionLogController_1.getExecutionLogs);
// Obtener estadísticas
router.get("/stats", executionLogController_1.getExecutionStats);
// Obtener detalle de una ejecución
router.get("/:id", executionLogController_1.getExecutionDetail);
// Obtener detalles de error
router.get("/:id/error", executionLogController_1.getExecutionError);
exports.default = router;
