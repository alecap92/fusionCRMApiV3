"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ContactsApi_1 = require("../../controllers/api/ContactsApi");
const router = (0, express_1.Router)();
// Buscar contacto por teléfono (debe ir antes de la ruta POST)
router.get("/search", ContactsApi_1.searchContactByPhone);
// Crear contacto
router.post("/", ContactsApi_1.createContact);
exports.default = router;
