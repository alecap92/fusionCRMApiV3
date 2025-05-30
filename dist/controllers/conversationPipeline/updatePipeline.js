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
exports.deletePipeline = exports.updatePipeline = void 0;
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
/**
 * Actualiza un pipeline de conversación
 */
const updatePipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, stages, isDefault } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const pipeline = yield ConversationPipelineModel_1.default.findOne({
            _id: id,
            organization: organizationId,
        });
        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: "Pipeline no encontrado",
            });
        }
        // Actualizar campos si se proporcionan
        if (name)
            pipeline.name = name;
        // Si este pipeline será el predeterminado, desactivar cualquier otro predeterminado
        if (isDefault !== undefined && isDefault && !pipeline.isDefault) {
            yield ConversationPipelineModel_1.default.updateMany({ organization: organizationId, isDefault: true }, { isDefault: false });
            pipeline.isDefault = true;
        }
        else if (isDefault !== undefined) {
            pipeline.isDefault = isDefault;
        }
        // Si hay nuevas etapas, actualizarlas
        if (stages && Array.isArray(stages)) {
            // Guardar las etapas existentes para mapeo
            const existingStages = [...pipeline.stages];
            // Actualizar las etapas
            pipeline.stages = stages.map((stage, index) => ({
                name: stage.name,
                order: stage.order !== undefined ? stage.order : index,
                color: stage.color || "#808080",
                autoAssign: stage.autoAssign || false,
                assignToTeam: stage.assignToTeam || null,
            }));
            // Si se eliminaron etapas, actualizar las conversaciones afectadas
            if (existingStages.length > pipeline.stages.length) {
                // Obtenemos el máximo orden de las nuevas etapas
                const maxStageOrder = Math.max(...pipeline.stages.map((s) => s.order));
                // Actualizamos las conversaciones que estaban en etapas eliminadas para moverlas a la última etapa
                yield ConversationModel_1.default.updateMany({
                    pipeline: id,
                    currentStage: { $gte: pipeline.stages.length },
                }, { currentStage: maxStageOrder });
            }
        }
        yield pipeline.save();
        return res.status(200).json({
            success: true,
            data: pipeline,
            message: "Pipeline actualizado exitosamente",
        });
    }
    catch (error) {
        console.error("Error al actualizar pipeline:", error);
        return res.status(500).json({
            success: false,
            message: "Error al actualizar pipeline",
            error: error.message,
        });
    }
});
exports.updatePipeline = updatePipeline;
/**
 * Elimina un pipeline de conversación
 */
const deletePipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        // Verificar si es el único pipeline o si es el predeterminado
        const pipelineCount = yield ConversationPipelineModel_1.default.countDocuments({
            organization: organizationId,
        });
        const pipeline = yield ConversationPipelineModel_1.default.findOne({
            _id: id,
            organization: organizationId,
        });
        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: "Pipeline no encontrado",
            });
        }
        // No permitir eliminar si es el único pipeline
        if (pipelineCount <= 1) {
            return res.status(400).json({
                success: false,
                message: "No se puede eliminar el único pipeline existente",
            });
        }
        // Verificar si hay conversaciones usando este pipeline
        const conversationsCount = yield ConversationModel_1.default.countDocuments({
            pipeline: id,
        });
        if (conversationsCount > 0) {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar el pipeline porque hay ${conversationsCount} conversaciones asociadas`,
            });
        }
        // Eliminar el pipeline
        yield ConversationPipelineModel_1.default.deleteOne({ _id: id });
        // Si era el predeterminado, establecer otro como predeterminado
        if (pipeline.isDefault) {
            const anotherPipeline = yield ConversationPipelineModel_1.default.findOne({
                organization: organizationId,
                _id: { $ne: id },
            });
            if (anotherPipeline) {
                anotherPipeline.isDefault = true;
                yield anotherPipeline.save();
            }
        }
        return res.status(200).json({
            success: true,
            message: "Pipeline eliminado exitosamente",
        });
    }
    catch (error) {
        console.error("Error al eliminar pipeline:", error);
        return res.status(500).json({
            success: false,
            message: "Error al eliminar pipeline",
            error: error.message,
        });
    }
});
exports.deletePipeline = deletePipeline;
