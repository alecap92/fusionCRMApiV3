import { Router } from "express";
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from "../controllers/purchases/purchaseController";

const router = Router();

// Ruta para obtener todas las órdenes de compra
router.get("/orders", getPurchaseOrders);

// Ruta para obtener una orden de compra por ID
router.get("/orders/:id", getPurchaseOrderById);

// Ruta para crear una nueva orden de compra
router.post("/orders", createPurchaseOrder);

// Ruta para actualizar una orden de compra existente
router.put("/orders/:id", updatePurchaseOrder);

// Ruta para eliminar una orden de compra
router.delete("/orders/:id", deletePurchaseOrder);

export default router;
