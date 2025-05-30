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
exports.deleteStrategy = exports.updateStrategy = exports.createStrategy = exports.getStrategy = exports.getStrategies = void 0;
const StrategyModel_1 = __importDefault(require("../../models/StrategyModel"));
const mongoose_1 = __importDefault(require("mongoose"));
// Obtener todas las estrategias de una organización
const getStrategies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(400)
                .json({ success: false, message: "organizationId es requerido" });
        }
        const strategies = yield StrategyModel_1.default.find({ organizationId });
        return res.status(200).json({ success: true, data: strategies });
    }
    catch (error) {
        console.error("Error al obtener estrategias:", error);
        return res
            .status(500)
            .json({ success: false, message: "Error al obtener estrategias" });
    }
});
exports.getStrategies = getStrategies;
// Obtener una estrategia específica
const getStrategy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res
                .status(400)
                .json({ success: false, message: "ID de estrategia inválido" });
        }
        const strategy = yield StrategyModel_1.default.findById(id);
        if (!strategy) {
            return res
                .status(404)
                .json({ success: false, message: "Estrategia no encontrada" });
        }
        return res.status(200).json({ success: true, data: strategy });
    }
    catch (error) {
        console.error("Error al obtener estrategia:", error);
        return res
            .status(500)
            .json({ success: false, message: "Error al obtener estrategia" });
    }
});
exports.getStrategy = getStrategy;
// Crear una nueva estrategia
const createStrategy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        const { name, description, funnel, audience } = req.body;
        if (!organizationId || !userId || !name) {
            return res.status(400).json({
                success: false,
                message: "organizationId, userId y name son campos requeridos",
            });
        }
        const newStrategy = new StrategyModel_1.default({
            organizationId,
            userId,
            name,
            description,
            funnel,
            audience,
        });
        const savedStrategy = yield newStrategy.save();
        return res.status(201).json({ success: true, data: savedStrategy });
    }
    catch (error) {
        console.error("Error al crear estrategia:", error);
        return res
            .status(500)
            .json({ success: false, message: "Error al crear estrategia" });
    }
});
exports.createStrategy = createStrategy;
// Actualizar una estrategia
const updateStrategy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(400)
                .json({ success: false, message: "organizationId es requerido" });
        }
        const { id } = req.params;
        const updateData = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res
                .status(400)
                .json({ success: false, message: "ID de estrategia inválido" });
        }
        const updatedStrategy = yield StrategyModel_1.default.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
        if (!updatedStrategy) {
            return res
                .status(404)
                .json({ success: false, message: "Estrategia no encontrada" });
        }
        return res.status(200).json({ success: true, data: updatedStrategy });
    }
    catch (error) {
        console.error("Error al actualizar estrategia:", error);
        return res
            .status(500)
            .json({ success: false, message: "Error al actualizar estrategia" });
    }
});
exports.updateStrategy = updateStrategy;
// Eliminar una estrategia
const deleteStrategy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res
                .status(400)
                .json({ success: false, message: "ID de estrategia inválido" });
        }
        const deletedStrategy = yield StrategyModel_1.default.findByIdAndDelete(id);
        if (!deletedStrategy) {
            return res
                .status(404)
                .json({ success: false, message: "Estrategia no encontrada" });
        }
        return res.status(200).json({
            success: true,
            message: "Estrategia eliminada correctamente",
            data: deletedStrategy,
        });
    }
    catch (error) {
        console.error("Error al eliminar estrategia:", error);
        return res
            .status(500)
            .json({ success: false, message: "Error al eliminar estrategia" });
    }
});
exports.deleteStrategy = deleteStrategy;
