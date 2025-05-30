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
exports.createPipeline = void 0;
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
/**
 * Crea un nuevo pipeline para conversaciones
 */
const createPipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, stages, isDefault = false } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!name || !stages || !Array.isArray(stages)) {
            return res.status(400).json({
                success: false,
                message: "Nombre y etapas son requeridos. Las etapas deben ser un array.",
            });
        }
        // Validar que las etapas tengan nombre y orden
        for (const stage of stages) {
            if (!stage.name || stage.order === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "Cada etapa debe tener un nombre y un orden",
                });
            }
        }
        // Si este pipeline será el predeterminado, desactivar cualquier otro predeterminado
        if (isDefault) {
            yield ConversationPipelineModel_1.default.updateMany({ organization: organizationId, isDefault: true }, { isDefault: false });
        }
        const pipeline = new ConversationPipelineModel_1.default({
            name,
            organization: organizationId,
            stages: stages.map((stage, index) => ({
                name: stage.name,
                order: stage.order || index,
                color: stage.color || "#808080",
                autoAssign: stage.autoAssign || false,
                assignToTeam: stage.assignToTeam || null,
            })),
            isDefault,
        });
        yield pipeline.save();
        return res.status(201).json({
            success: true,
            data: pipeline,
            message: "Pipeline creado exitosamente",
        });
    }
    catch (error) {
        console.error("Error al crear pipeline:", error);
        return res.status(500).json({
            success: false,
            message: "Error al crear pipeline",
            error: error.message,
        });
    }
});
exports.createPipeline = createPipeline;
