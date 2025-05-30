"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const automationSystemController_1 = require("../controllers/automationSystemController");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(authMiddleware_1.verifyToken);
// Rutas CRUD básicas
router.get("/", automationSystemController_1.getAutomations);
router.get("/:id", automationSystemController_1.getAutomation);
router.post("/", automationSystemController_1.createAutomation);
router.put("/:id", automationSystemController_1.updateAutomation);
router.delete("/:id", automationSystemController_1.deleteAutomation);
// Rutas de funcionalidad específica
router.patch("/:id/toggle", automationSystemController_1.toggleAutomationStatus);
router.post("/:id/execute", automationSystemController_1.executeAutomation);
router.get("/:id/executions", automationSystemController_1.getExecutionHistory);
exports.default = router;
