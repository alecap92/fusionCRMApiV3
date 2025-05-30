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
exports.changeConversationPipeline = exports.moveConversationStage = exports.updateConversation = void 0;
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
/**
 * Actualiza los datos de una conversación
 */
const updateConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { title, assignedTo, isResolved, priority, tags, metadata, currentStage, } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const conversation = yield ConversationModel_1.default.findOne({
            _id: id,
            organization: organizationId,
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversación no encontrada",
            });
        }
        // Actualizar campos si se proporcionan
        if (title !== undefined)
            conversation.title = title;
        if (assignedTo !== undefined)
            conversation.assignedTo = assignedTo;
        if (isResolved !== undefined)
            conversation.isResolved = isResolved;
        if (priority !== undefined)
            conversation.priority = priority;
        if (tags !== undefined)
            conversation.tags = tags;
        if (metadata !== undefined)
            conversation.metadata = metadata;
        if (currentStage !== undefined)
            conversation.currentStage = currentStage;
        yield conversation.save();
        return res.status(200).json({
            success: true,
            data: conversation,
            message: "Conversación actualizada exitosamente",
        });
    }
    catch (error) {
        console.error("Error al actualizar conversación:", error);
        return res.status(500).json({
            success: false,
            message: "Error al actualizar conversación",
            error: error.message,
        });
    }
});
exports.updateConversation = updateConversation;
/**
 * Mueve una conversación a una etapa diferente del pipeline
 */
const moveConversationStage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { stageIndex } = req.body;
        const organizationId = req.organization;
        if (stageIndex === undefined || stageIndex < 0) {
            return res.status(400).json({
                success: false,
                message: "Se requiere un índice de etapa válido",
            });
        }
        const conversation = yield ConversationModel_1.default.findOne({
            _id: id,
            organization: organizationId,
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversación no encontrada",
            });
        }
        // Validar que la etapa existe en el pipeline
        const pipeline = yield ConversationPipelineModel_1.default.findById(conversation.pipeline);
        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: "El pipeline asociado a esta conversación no existe",
            });
        }
        if (stageIndex >= pipeline.stages.length) {
            return res.status(400).json({
                success: false,
                message: "El índice de etapa está fuera de rango",
            });
        }
        // Actualizar la etapa
        conversation.currentStage = stageIndex;
        // Si la etapa tiene configuración de asignación automática, asignar al equipo correspondiente
        const targetStage = pipeline.stages[stageIndex];
        if (targetStage.autoAssign && targetStage.assignToTeam) {
            conversation.assignedTo = targetStage.assignToTeam;
        }
        yield conversation.save();
        return res.status(200).json({
            success: true,
            data: conversation,
            message: "Conversación movida exitosamente",
        });
    }
    catch (error) {
        console.error("Error al mover conversación:", error);
        return res.status(500).json({
            success: false,
            message: "Error al mover conversación",
            error: error.message,
        });
    }
});
exports.moveConversationStage = moveConversationStage;
/**
 * Cambia el pipeline de una conversación
 */
const changeConversationPipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { pipelineId, initialStage = 0 } = req.body;
        const organizationId = req.organization;
        if (!pipelineId) {
            return res.status(400).json({
                success: false,
                message: "Se requiere un ID de pipeline",
            });
        }
        // Verificar que el pipeline existe
        const pipeline = yield ConversationPipelineModel_1.default.findOne({
            _id: pipelineId,
            organization: organizationId,
        });
        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: "Pipeline no encontrado",
            });
        }
        if (initialStage < 0 || initialStage >= pipeline.stages.length) {
            return res.status(400).json({
                success: false,
                message: "El índice de etapa inicial está fuera de rango",
            });
        }
        const conversation = yield ConversationModel_1.default.findOne({
            _id: id,
            organization: organizationId,
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversación no encontrada",
            });
        }
        // Actualizar el pipeline y la etapa
        conversation.pipeline = pipelineId;
        conversation.currentStage = initialStage;
        // Si la etapa inicial tiene configuración de asignación automática
        const targetStage = pipeline.stages[initialStage];
        if (targetStage.autoAssign && targetStage.assignToTeam) {
            conversation.assignedTo = targetStage.assignToTeam;
        }
        yield conversation.save();
        return res.status(200).json({
            success: true,
            data: conversation,
            message: "Pipeline de conversación actualizado exitosamente",
        });
    }
    catch (error) {
        console.error("Error al cambiar pipeline de conversación:", error);
        return res.status(500).json({
            success: false,
            message: "Error al cambiar pipeline de conversación",
            error: error.message,
        });
    }
});
exports.changeConversationPipeline = changeConversationPipeline;
