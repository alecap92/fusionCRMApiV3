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
exports.getStatusDealsCount = exports.deleteStatus = exports.editStatusByPipeline = exports.editStatus = exports.getStatus = exports.createStatus = void 0;
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const StatusModel_1 = __importDefault(require("../../models/StatusModel"));
// Crear estado
const createStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = req.body;
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return;
        }
        const newStatus = new StatusModel_1.default(Object.assign(Object.assign({}, form), { organizationId: req.user.organizationId }));
        const status = yield newStatus.save();
        res.status(201).json(status);
    }
    catch (error) {
        console.error("Error creando el estado:", error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Error desconocido" });
        }
    }
});
exports.createStatus = createStatus;
// Obtener estados
const getStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const pipelineId = req.query.pipelineId;
    try {
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return;
        }
        const status = yield StatusModel_1.default.find({
            organizationId: req.user.organizationId,
            pipeline: pipelineId,
        }).exec();
        res.status(200).json(status);
    }
    catch (error) {
        console.error("Error creando el estado:", error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Error desconocido" });
        }
    }
});
exports.getStatus = getStatus;
// Editar estado
const editStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const statusId = req.params.id;
        const form = req.body;
        const status = yield StatusModel_1.default.findByIdAndUpdate(statusId, form, {
            new: true,
        }).exec();
        if (!status) {
            res.status(404).json({ message: "Estado no encontrado" });
            return;
        }
        res.status(200).json(status);
    }
    catch (error) {
        console.error("Error creando el estado:", error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Error desconocido" });
        }
    }
});
exports.editStatus = editStatus;
// Editar estados por pipeline
const editStatusByPipeline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pipelineId = req.params.id;
        const form = req.body;
        console.log("CASASS");
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return;
        }
        const currentStatus = yield StatusModel_1.default.find({
            organizationId: req.user.organizationId,
            pipeline: pipelineId,
        }).exec();
        yield StatusModel_1.default.deleteMany({ pipeline: pipelineId }).exec();
        const statesToCreate = form.filter((status) => !status._id);
        yield StatusModel_1.default.insertMany(statesToCreate.map((status) => {
            var _a;
            return (Object.assign(Object.assign({}, status), { organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId, pipeline: pipelineId }));
        }));
        const statesToUpdate = form.filter((status) => status._id);
        const insertedStates = yield StatusModel_1.default.insertMany(statesToUpdate.map((status) => {
            var _a;
            return (Object.assign(Object.assign({}, status), { organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId, pipeline: pipelineId }));
        }));
        const insertedIds = new Set(insertedStates.map((state) => state._id.toString()));
        const currentIds = new Set(currentStatus.map((state) => { var _a; return (_a = state._id) === null || _a === void 0 ? void 0 : _a.toString(); }));
        const removedIds = [...currentIds].filter((id) => !insertedIds.has(id));
        yield DealsModel_1.default.updateMany({ status: { $in: removedIds } }, { status: insertedStates[0]._id.toString() }).exec();
        res.status(200).json({ message: "Estados actualizados correctamente" });
    }
    catch (error) {
        console.error("Error creando el estado:", error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Error desconocido" });
        }
    }
});
exports.editStatusByPipeline = editStatusByPipeline;
// Eliminar estado
const deleteStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const statusId = req.params.id;
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return;
        }
        const status = yield StatusModel_1.default.findById(statusId).exec();
        if (!status) {
            res.status(404).json({ message: "Estado no encontrado" });
            return;
        }
        // Verificar que el status pertenece a la organización del usuario
        if (status.organizationId.toString() !== req.user.organizationId) {
            res
                .status(403)
                .json({ message: "No tienes permisos para eliminar este estado" });
            return;
        }
        // Verificar si hay deals asociados a este status
        const dealsCount = yield DealsModel_1.default.countDocuments({ status: statusId }).exec();
        if (dealsCount > 0) {
            res.status(400).json({
                message: `No se puede eliminar el estado porque tiene ${dealsCount} deal(s) asociado(s)`,
            });
            return;
        }
        yield StatusModel_1.default.findByIdAndDelete(statusId).exec();
        res.status(200).json({ message: "Estado eliminado correctamente" });
    }
    catch (error) {
        console.error("Error eliminando el estado:", error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Error desconocido" });
        }
    }
});
exports.deleteStatus = deleteStatus;
// Verificar conteo de deals por status
const getStatusDealsCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const statusId = req.params.id;
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return;
        }
        // Contar deals asociados a este status
        const dealsCount = yield DealsModel_1.default.countDocuments({ status: statusId }).exec();
        res.status(200).json({
            hasDeals: dealsCount > 0,
            count: dealsCount,
        });
    }
    catch (error) {
        console.error("Error verificando deals del estado:", error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Error desconocido" });
        }
    }
});
exports.getStatusDealsCount = getStatusDealsCount;
