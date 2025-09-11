"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const n8nAutomations_1 = __importDefault(require("./n8nAutomations"));
const integrations_1 = __importDefault(require("./integrations"));
const router = (0, express_1.Router)();
// 🔧 Rutas para automatizaciones de n8n (el sistema existente)
router.use("/automations", n8nAutomations_1.default);
// 🔐 Rutas para integraciones de n8n (nuevo sistema para que n8n consuma la API)
router.use("/integrations", integrations_1.default);
exports.default = router;
