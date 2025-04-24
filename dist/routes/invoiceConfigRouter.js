"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoiceConfigController_1 = require("../controllers/invoice/invoiceConfigController");
const upload_1 = __importDefault(require("../config/upload"));
const router = (0, express_1.Router)();
// Rutas principales para la configuración completa
router.get("/", invoiceConfigController_1.getInvoiceConfig);
router.put("/", invoiceConfigController_1.updateInvoiceConfig);
router.post("/company", invoiceConfigController_1.createCompany);
router.post("/", invoiceConfigController_1.createInvoiceConfig);
// Rutas para actualizar secciones específicas
router.put("/company-info", invoiceConfigController_1.updateCompanyInfo);
router.put("/email-settings", invoiceConfigController_1.updateEmailSettings);
router.put("/placeholders", invoiceConfigController_1.updatePlaceholders);
router.put("/resolution-number", invoiceConfigController_1.updateResolutionNumber);
router.post("/parseCertificate", upload_1.default.single("certificado"), invoiceConfigController_1.certificateConfiguration);
// Rutas para funcionalidades adicionales
router.get("/next-number", invoiceConfigController_1.getNextInvoiceNumber);
router.get("/resolution-status", invoiceConfigController_1.checkResolutionStatus);
exports.default = router;
/*

1.

*/ 
