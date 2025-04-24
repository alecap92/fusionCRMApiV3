"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/webhook.ts
const express_1 = require("express");
const webhookController_1 = require("../controllers/webhook/webhookController");
const router = (0, express_1.Router)();
// IMPORTANTE: Las rutas más específicas deben ir primero
// Rutas para webhooks con ID único
router.post("/id/:uniqueId", webhookController_1.handleWebhookById);
router.get("/id/:uniqueId", webhookController_1.verifyWebhookById);
// Rutas generales para webhooks (mantener para compatibilidad)
router.post("/:module/:event", webhookController_1.handleWebhook);
router.get("/:module/:event", webhookController_1.verifyWebhook);
exports.default = router;
