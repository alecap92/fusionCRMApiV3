"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reopenConversationIfClosed = exports.createConversation = void 0;
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
const createConversation = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { organizationId, userId, to, pipelineId, assignedTo } = data;
        const newConversation = yield ConversationModel_1.default.create({
            title: `Conversación con ${to}`,
            organization: organizationId,
            participants: {
                user: {
                    type: "User",
                    reference: userId,
                },
                contact: {
                    type: "Contact",
                    reference: to,
                },
            },
            pipeline: pipelineId,
            currentStage: 0,
            assignedTo: assignedTo,
            priority: "medium",
            firstContactTimestamp: new Date(),
        });
        return newConversation;
    }
    catch (error) {
        console.log(error);
    }
});
exports.createConversation = createConversation;
/**
 * Reabre una conversación cuando llega un mensaje entrante
 * @param conversation - La conversación a evaluar para reapertura
 * @returns boolean - true si se reabrió la conversación
 */
const reopenConversationIfClosed = (conversation) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obtener el pipeline de la conversación
        const pipeline = yield ConversationPipelineModel_1.default.findById(conversation.pipeline);
        if (!pipeline) {
            console.error("Pipeline no encontrado para la conversación:", conversation._id);
            return false;
        }
        // Buscar el stage de "Cerrado" o "Finalizado" de manera dinámica
        const closedStage = pipeline.stages.find((stage) => stage.name.toLowerCase().includes("cerrado") ||
            stage.name.toLowerCase().includes("finalizado") ||
            stage.name.toLowerCase().includes("resuelto") ||
            stage.name.toLowerCase().includes("completado"));
        // Si no encuentra un stage específico de cerrado, usar el último stage del pipeline
        const closedStageIndex = closedStage
            ? closedStage.order
            : pipeline.stages.length - 1;
        // Verificar si la conversación está en un estado cerrado
        const isConversationClosed = conversation.currentStage === closedStageIndex || conversation.isResolved;
        if (isConversationClosed) {
            // Reabrir la conversación
            conversation.currentStage = 0; // Mover a "Sin Atender"
            conversation.isResolved = false;
            // Agregar metadata de reapertura
            if (!conversation.metadata) {
                conversation.metadata = [];
            }
            conversation.metadata.push({
                key: "auto-reopen",
                value: `Reabierta automáticamente por mensaje entrante - ${new Date().toISOString()}`,
            });
            yield conversation.save();
            return true;
        }
        return false;
    }
    catch (error) {
        console.error("Error al reabrir conversación:", error);
        return false;
    }
});
exports.reopenConversationIfClosed = reopenConversationIfClosed;
