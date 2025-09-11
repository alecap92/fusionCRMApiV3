import { Router } from "express";
import * as conversationController from "../controllers/conversation";
import * as pipelineController from "../controllers/conversationPipeline";
import * as automationController from "../controllers/conversation/automationController";

const router = Router();

// La autenticación se maneja a nivel de rutas principales (index.ts)

// Rutas para pipelines de conversación
router.post("/pipelines", pipelineController.createPipeline);
router.get("/pipelines", pipelineController.getPipelines);
router.get("/pipelines/default", pipelineController.getDefaultPipeline);
router.get("/pipelines/:id", pipelineController.getPipelineById);
router.put("/pipelines/:id", pipelineController.updatePipeline);
router.delete("/pipelines/:id", pipelineController.deletePipeline);

// Rutas para conversaciones
router.post("/", conversationController.createConversation);
router.get("/", conversationController.getConversations);
router.get("/search", conversationController.searchConversations);
router.get("/find-by-phone", conversationController.findConversationByPhone);
router.get("/kanban", conversationController.getConversationsKanban);
router.get("/stats", conversationController.getConversationStats);
router.get("/unread", conversationController.getUnreadMessagesCount);
router.get("/:id", conversationController.getConversationById);
router.put("/:id", conversationController.updateConversation);
router.put("/:id/stage", conversationController.moveConversationStage);
router.put("/:id/pipeline", conversationController.changeConversationPipeline);
router.delete("/:id", conversationController.deleteConversation);

// Rutas para mensajes dentro de conversaciones
router.post("/:conversationId/messages", conversationController.addMessage);
router.put(
  "/:conversationId/read",
  conversationController.markConversationAsRead
);

// Rutas para automatizaciones
router.post(
  "/:conversationId/automations/pause",
  automationController.pauseAutomations
);
router.post(
  "/:conversationId/automations/resume",
  automationController.resumeAutomations
);
router.get(
  "/:conversationId/automations/status",
  automationController.getAutomationStatus
);
router.get(
  "/:conversationId/automations/history",
  automationController.getAutomationHistory
);
router.get(
  "/:conversationId/automations/can-trigger",
  automationController.canTriggerAutomation
);

export default router;
