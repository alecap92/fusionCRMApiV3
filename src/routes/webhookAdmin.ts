// src/routes/webhookAdmin.ts
import { Router } from "express";
import {
  getWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  regenerateWebhookSecret,
} from "../controllers/webhook/webhookAdminController";

const router: Router = Router();

// Rutas para administración de webhooks
router.get("/", getWebhookEndpoints);
router.post("/", createWebhookEndpoint);
router.patch("/:id", updateWebhookEndpoint);
router.post("/:id/regenerate-secret", regenerateWebhookSecret);
router.delete("/:id", deleteWebhookEndpoint);

export default router;
