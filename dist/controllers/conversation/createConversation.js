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
exports.createConversation = void 0;
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
/**
 * Crea una nueva conversación
 */
const createConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { title, participants, pipelineId, initialStage, assignedTo, priority = "medium", tags = [], metadata = [], } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        if (!title || !participants || !Array.isArray(participants)) {
            return res.status(400).json({
                success: false,
                message: "Título y participantes son requeridos. Los participantes deben ser un array.",
            });
        }
        // Validar que cada participante tenga tipo y referencia
        for (const participant of participants) {
            if (!participant.type || !participant.reference) {
                return res.status(400).json({
                    success: false,
                    message: "Cada participante debe tener un tipo y una referencia",
                });
            }
        }
        // Si no se proporciona un pipelineId, buscar el pipeline predeterminado
        let pipeline = pipelineId;
        if (!pipelineId) {
            const defaultPipeline = yield ConversationPipelineModel_1.default.findOne({
                organization: organizationId,
                isDefault: true,
            });
            if (!defaultPipeline) {
                return res.status(400).json({
                    success: false,
                    message: "No se encontró un pipeline predeterminado. Se debe proporcionar un pipelineId.",
                });
            }
            pipeline = defaultPipeline._id;
        }
        // Crear la conversación
        const conversation = new ConversationModel_1.default({
            title,
            organization: organizationId,
            participants,
            pipeline,
            currentStage: initialStage || 0,
            assignedTo: assignedTo || userId,
            priority,
            tags,
            firstContactTimestamp: new Date(),
            metadata,
        });
        yield conversation.save();
        return res.status(201).json({
            success: true,
            data: conversation,
            message: "Conversación creada exitosamente",
        });
    }
    catch (error) {
        console.error("Error al crear conversación:", error);
        return res.status(500).json({
            success: false,
            message: "Error al crear conversación",
            error: error.message,
        });
    }
});
exports.createConversation = createConversation;
