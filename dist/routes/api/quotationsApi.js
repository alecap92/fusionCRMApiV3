"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authApiMiddleware_1 = require("../../middlewares/authApiMiddleware");
const QuotationsApi_1 = require("../../controllers/api/QuotationsApi");
const apiTypes_1 = require("../../types/apiTypes");
const router = (0, express_1.Router)();
// Crear cotización - requiere permiso de escritura
router.post("/", (0, authApiMiddleware_1.requireApiPermission)(apiTypes_1.API_PERMISSIONS.QUOTATIONS_WRITE), QuotationsApi_1.createQuotationApi);
// Descargar cotización - requiere permiso de lectura
router.get("/:number/download", QuotationsApi_1.downloadQuotationApi);
exports.default = router;
