"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const WhatsAppApi_1 = require("../../controllers/api/WhatsAppApi");
const router = (0, express_1.Router)();
// 📱 Enviar mensaje de WhatsApp
router.post("/send", WhatsAppApi_1.sendMessage);
exports.default = router;
