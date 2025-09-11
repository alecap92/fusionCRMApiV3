"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authApiMiddleware_1 = require("../../middlewares/authApiMiddleware");
const quotationController_1 = require("../../controllers/quotations/quotationController");
const apiTypes_1 = require("../../types/apiTypes");
const router = (0, express_1.Router)();
// Crear cotización - requiere permiso de escritura
router.post("/", (0, authApiMiddleware_1.requireApiPermission)(apiTypes_1.API_PERMISSIONS.QUOTATIONS_WRITE), quotationController_1.createQuotationApi);
exports.default = router;
