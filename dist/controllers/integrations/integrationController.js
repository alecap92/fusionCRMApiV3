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
exports.deleteIntegration = exports.updateIntegration = exports.createIntegration = exports.getIntegration = exports.getIntegrations = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const IntegrationsModel_1 = __importDefault(require("../../models/IntegrationsModel"));
// 🧠 Validar ID válido
const isValidObjectId = (id) => mongoose_1.default.Types.ObjectId.isValid(id);
// 🔍 Obtener todas las integraciones de la organización
const getIntegrations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const integrations = yield IntegrationsModel_1.default.find({ organizationId });
        res.status(200).json(integrations);
    }
    catch (error) {
        console.error("Error al obtener integraciones:", error);
        res.status(500).json({ message: "Error al obtener integraciones" });
    }
});
exports.getIntegrations = getIntegrations;
// 🔍 Obtener una integración específica
const getIntegration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id))
            return res.status(400).json({ message: "ID inválido" });
        const integration = yield IntegrationsModel_1.default.findById(id);
        if (!integration)
            return res.status(404).json({ message: "Integración no encontrada" });
        res.status(200).json(integration);
    }
    catch (error) {
        console.error("Error al obtener la integración:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});
exports.getIntegration = getIntegration;
// ➕ Crear nueva integración
const createIntegration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { service, credentials, settings, name } = req.body;
        if (!service || !credentials) {
            return res.status(400).json({ message: "Faltan datos requeridos" });
        }
        // Evitar duplicados por tipo
        const exists = yield IntegrationsModel_1.default.findOne({ organizationId, service });
        if (exists) {
            return res
                .status(400)
                .json({ message: `Ya existe una integración para ${service}` });
        }
        const integration = new IntegrationsModel_1.default({
            organizationId,
            service,
            credentials,
            settings,
            name,
        });
        yield integration.save();
        res.status(201).json(integration);
    }
    catch (error) {
        console.error("Error al crear la integración:", error);
        res.status(500).json({ message: "Error al crear integración" });
    }
});
exports.createIntegration = createIntegration;
// ✏️ Actualizar integración
const updateIntegration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id))
            return res.status(400).json({ message: "ID inválido" });
        const integration = yield IntegrationsModel_1.default.findById(id);
        if (!integration)
            return res.status(404).json({ message: "Integración no encontrada" });
        const { credentials, settings, isActive, name } = req.body;
        if (credentials)
            integration.credentials = credentials;
        if (settings)
            integration.settings = settings;
        if (typeof isActive === "boolean")
            integration.isActive = isActive;
        if (name)
            integration.name = name;
        yield integration.save();
        res.status(200).json(integration);
    }
    catch (error) {
        console.error("Error al actualizar integración:", error);
        res.status(500).json({ message: "Error al actualizar integración" });
    }
});
exports.updateIntegration = updateIntegration;
// ❌ Eliminar integración
const deleteIntegration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id))
            return res.status(400).json({ message: "ID inválido" });
        const deleted = yield IntegrationsModel_1.default.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ message: "Integración no encontrada" });
        res.status(200).json({ message: "Integración eliminada correctamente" });
    }
    catch (error) {
        console.error("Error al eliminar integración:", error);
        res.status(500).json({ message: "Error al eliminar integración" });
    }
});
exports.deleteIntegration = deleteIntegration;
