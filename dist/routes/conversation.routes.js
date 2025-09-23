"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversationController = __importStar(require("../controllers/conversation"));
const pipelineController = __importStar(require("../controllers/conversationPipeline"));
const automationController = __importStar(require("../controllers/conversation/automationController"));
const router = (0, express_1.Router)();
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
router.put("/:conversationId/read", conversationController.markConversationAsRead);
// Rutas para automatizaciones
router.post("/:conversationId/automations/pause", automationController.pauseAutomations);
router.post("/:conversationId/automations/resume", automationController.resumeAutomations);
router.get("/:conversationId/automations/status", automationController.getAutomationStatus);
router.get("/:conversationId/automations/history", automationController.getAutomationHistory);
router.get("/:conversationId/automations/can-trigger", automationController.canTriggerAutomation);
exports.default = router;
