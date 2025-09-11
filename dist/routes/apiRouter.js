"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authApiMiddleware_1 = require("../middlewares/authApiMiddleware");
const contactsApi_1 = __importDefault(require("./api/contactsApi"));
const dealsApi_1 = __importDefault(require("./api/dealsApi"));
const whatsappApi_1 = __importDefault(require("./api/whatsappApi"));
const quotationsApi_1 = __importDefault(require("./api/quotationsApi"));
const tokenApi_1 = __importDefault(require("./api/tokenApi"));
const router = (0, express_1.Router)();
// Ruta para gestión de tokens (requiere autenticación de usuario, no API)
router.use("/tokens", tokenApi_1.default);
// Middleware de autenticación para todas las rutas de API
router.use(authApiMiddleware_1.verifyApiToken);
// Rutas de la API organizadas (protegidas con token de API)
router.use("/contacts", contactsApi_1.default);
router.use("/deals", dealsApi_1.default);
router.use("/whatsapp", whatsappApi_1.default);
router.use("/quotations", quotationsApi_1.default);
exports.default = router;
