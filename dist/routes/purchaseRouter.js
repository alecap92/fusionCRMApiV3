"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchaseController_1 = require("../controllers/purchases/purchaseController");
const router = (0, express_1.Router)();
// Ruta para obtener todas las órdenes de compra
router.get("/orders", purchaseController_1.getPurchaseOrders);
// Ruta para obtener una orden de compra por ID
router.get("/orders/:id", purchaseController_1.getPurchaseOrderById);
// Ruta para crear una nueva orden de compra
router.post("/orders", purchaseController_1.createPurchaseOrder);
// Ruta para actualizar una orden de compra existente
router.put("/orders/:id", purchaseController_1.updatePurchaseOrder);
// Ruta para eliminar una orden de compra
router.delete("/orders/:id", purchaseController_1.deletePurchaseOrder);
exports.default = router;
