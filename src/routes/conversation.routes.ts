import { Router } from "express";
import * as conversationController from "../controllers/conversation";
import * as pipelineController from "../controllers/conversationPipeline";
import { verifyToken } from "../middlewares/authMiddleware";

const router = Router();

// Middleware para autenticación
router.use(verifyToken);

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
router.get("/kanban", conversationController.getConversationsKanban);
router.get("/stats", conversationController.getConversationStats);
router.get("/unread", conversationController.getUnreadMessagesCount);
router.get("/:id", conversationController.getConversationById);
router.put("/:id", conversationController.updateConversation);
router.put("/:id/stage", conversationController.moveConversationStage);
router.put("/:id/pipeline", conversationController.changeConversationPipeline);

// Rutas para mensajes dentro de conversaciones
router.post("/:conversationId/messages", conversationController.addMessage);
router.put(
  "/:conversationId/read",
  conversationController.markConversationAsRead
);

export default router;
