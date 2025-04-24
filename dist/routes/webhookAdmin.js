"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/webhookAdmin.ts
const express_1 = require("express");
const webhookAdminController_1 = require("../controllers/webhook/webhookAdminController");
const router = (0, express_1.Router)();
// Rutas para administración de webhooks
router.get("/", webhookAdminController_1.getWebhookEndpoints);
router.post("/", webhookAdminController_1.createWebhookEndpoint);
router.patch("/:id", webhookAdminController_1.updateWebhookEndpoint);
router.post("/:id/regenerate-secret", webhookAdminController_1.regenerateWebhookSecret);
router.delete("/:id", webhookAdminController_1.deleteWebhookEndpoint);
exports.default = router;
