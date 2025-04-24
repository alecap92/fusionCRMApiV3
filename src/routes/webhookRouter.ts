// src/routes/webhook.ts
import { Router } from "express";
import {
  handleWebhook,
  verifyWebhook,
  handleWebhookById,
  verifyWebhookById
} from "../controllers/webhook/webhookController";

const router: Router = Router();

// IMPORTANTE: Las rutas más específicas deben ir primero
// Rutas para webhooks con ID único
router.post("/id/:uniqueId", handleWebhookById);
router.get("/id/:uniqueId", verifyWebhookById);

// Rutas generales para webhooks (mantener para compatibilidad)
router.post("/:module/:event", handleWebhook);
router.get("/:module/:event", verifyWebhook);

export default router;
