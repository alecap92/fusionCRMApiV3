"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const integrationsController_1 = require("../../controllers/n8n/integrationsController");
const n8nAuthMiddleware_1 = require("../../middlewares/n8nAuthMiddleware");
const router = (0, express_1.Router)();
// 🔐 Rutas para integraciones de n8n
// Aquí se pueden agregar endpoints para que n8n consuma la API
// Aplicar middleware de autenticación n8n a todas las rutas
router.use(n8nAuthMiddleware_1.validateN8nWebhook);
// 📱 Webhooks de WhatsApp
router.post("/webhooks/whatsapp/send", integrationsController_1.sendWhatsAppMessage);
// 💬 Webhooks de conversaciones
router.post("/webhooks/conversations/create", integrationsController_1.createConversationFromN8n);
router.post("/webhooks/conversations/:conversationId/messages", integrationsController_1.addMessageToConversation);
router.put("/webhooks/conversations/:conversationId/status", integrationsController_1.updateConversationStatus);
router.get("/webhooks/conversations/:conversationId", integrationsController_1.getConversationInfo);
// 👥 Webhooks de contactos
router.post("/webhooks/contacts/create", integrationsController_1.createContactFromN8n);
router.put("/webhooks/contacts/:contactId", integrationsController_1.updateContactFromN8n);
router.get("/webhooks/contacts/:contactId", integrationsController_1.getContactInfo);
// 💼 Webhooks de deals
router.post("/webhooks/deals/create", integrationsController_1.createDealFromN8n);
router.put("/webhooks/deals/:dealId", integrationsController_1.updateDealFromN8n);
router.get("/webhooks/deals/:dealId", integrationsController_1.getDealInfo);
// 📅 Webhooks de actividades
router.post("/webhooks/activities/create", integrationsController_1.createActivityFromN8n);
exports.default = router;
