// src/routes/webhook.ts
import { Router } from "express";
import {
  handleWebhook,
  verifyWebhook,
} from "../controllers/webhook/webhookController";

const router: Router = Router();

// Rutas para webhooks
router.post("/:module/:event", handleWebhook);
router.get("/:module/:event", verifyWebhook);

export default router;
