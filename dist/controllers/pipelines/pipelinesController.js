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
exports.deletePipeline = exports.updatePipeline = exports.getPipelineById = exports.getPipelines = exports.createPipeline = void 0;
const PipelinesModel_1 = __importDefault(require("../../models/PipelinesModel"));
const StatusModel_1 = __importDefault(require("../../models/StatusModel"));
// Crear Pipeline
const createPipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, states } = req.body;
        const pipelines = new PipelinesModel_1.default({
            title,
            organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId,
        });
        yield pipelines.save();
        const pipelineId = pipelines._id;
        const statesArray = states.map((state, index) => {
            var _a;
            return ({
                name: state.name,
                order: state.order,
                pipeline: pipelineId,
                organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId,
            });
        });
        const newStates = yield StatusModel_1.default.insertMany(statesArray);
        res.status(200).json({
            message: "Pipeline creado con éxito",
            pipeline: pipelines,
            states: newStates,
        });
    }
    catch (error) {
        console.error("Error creando el pipeline:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.createPipeline = createPipeline;
// Obtener Pipelines
const getPipelines = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const pipelines = yield PipelinesModel_1.default.find({
            organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId,
        }).exec();
        res.status(200).json(pipelines);
    }
    catch (error) {
        console.error("Error obteniendo los pipelines:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getPipelines = getPipelines;
// Obtener Pipeline por ID
const getPipelineById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pipeline = yield PipelinesModel_1.default.findById(req.params.id).exec();
        if (!pipeline) {
            res.status(404).json({ message: "Pipeline no encontrado" });
            return;
        }
        res.status(200).json(pipeline);
    }
    catch (error) {
        console.error("Error obteniendo el pipeline:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getPipelineById = getPipelineById;
// Actualizar Pipeline
const updatePipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const updatedPipeline = yield PipelinesModel_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
        }).exec();
        if (!updatedPipeline) {
            res.status(404).json({ message: "Pipeline no encontrado" });
            return;
        }
        res.status(200).json({ message: "Pipeline actualizado", updatedPipeline });
    }
    catch (error) {
        console.error("Error actualizando el pipeline:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.updatePipeline = updatePipeline;
// Eliminar Pipeline
const deletePipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const deletedPipeline = yield PipelinesModel_1.default.findByIdAndDelete(id).exec();
        if (!deletedPipeline) {
            res.status(404).json({ message: "Pipeline no encontrado" });
            return;
        }
        yield StatusModel_1.default.deleteMany({ pipeline: id }).exec();
        res.status(200).json({ message: "Pipeline eliminado correctamente" });
    }
    catch (error) {
        console.error("Error eliminando el pipeline:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.deletePipeline = deletePipeline;
