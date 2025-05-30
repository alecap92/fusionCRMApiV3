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
exports.getDefaultPipeline = exports.getPipelineById = exports.getPipelines = void 0;
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
/**
 * Obtiene la lista de pipelines de conversación para una organización
 */
const getPipelines = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const pipelines = yield ConversationPipelineModel_1.default.find({
            organization: organizationId,
        });
        return res.status(200).json({
            success: true,
            data: pipelines,
            count: pipelines.length,
        });
    }
    catch (error) {
        console.error("Error al obtener pipelines:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener pipelines",
            error: error.message,
        });
    }
});
exports.getPipelines = getPipelines;
/**
 * Obtiene un pipeline específico por ID
 */
const getPipelineById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
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
        return res.status(200).json({
            success: true,
            data: pipeline,
        });
    }
    catch (error) {
        console.error("Error al obtener pipeline:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener pipeline",
            error: error.message,
        });
    }
});
exports.getPipelineById = getPipelineById;
/**
 * Obtiene el pipeline predeterminado de la organización
 */
const getDefaultPipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const pipeline = yield ConversationPipelineModel_1.default.findOne({
            organization: organizationId,
            isDefault: true,
        });
        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: "No hay pipeline predeterminado configurado",
            });
        }
        return res.status(200).json({
            success: true,
            data: pipeline,
        });
    }
    catch (error) {
        console.error("Error al obtener pipeline predeterminado:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener pipeline predeterminado",
            error: error.message,
        });
    }
});
exports.getDefaultPipeline = getDefaultPipeline;
