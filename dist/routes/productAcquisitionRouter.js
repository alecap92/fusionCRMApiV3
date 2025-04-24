"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productAcquisitionController_1 = require("../controllers/productAcquisitionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Rutas de adquisiciones de productos
router.post("/", authMiddleware_1.verifyToken, productAcquisitionController_1.productAcquisitionController.createAcquisition);
router.get("/client/:clientId/organizationId/:organizationId", authMiddleware_1.verifyToken, productAcquisitionController_1.productAcquisitionController.getClientAcquisitions);
router.get("/stats", authMiddleware_1.verifyToken, productAcquisitionController_1.productAcquisitionController.getAcquisitionStats);
exports.default = router;
