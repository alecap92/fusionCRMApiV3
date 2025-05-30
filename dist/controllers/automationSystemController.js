"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getExecutionHistory = exports.executeAutomation = exports.toggleAutomationStatus = exports.deleteAutomation = exports.updateAutomation = exports.createAutomation = exports.getAutomation = exports.getAutomations = void 0;
const AutomationModel_1 = __importDefault(require("../models/AutomationModel"));
const OrganizationModel_1 = __importDefault(require("../models/OrganizationModel"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
// Obtener todas las automatizaciones de la organización
const getAutomations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const user = yield UserModel_1.default.findById(userId);
        if (!user) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }
        const organization = yield OrganizationModel_1.default.findOne({
            employees: user._id,
        });
        if (!organization) {
            return res.status(404).json({ error: "Organización no encontrada" });
        }
        // Filtrar por tipo si se especifica
        const query = { organizationId: organization._id };
        if (req.query.automationType) {
            query.automationType = req.query.automationType;
        }
        const automations = yield AutomationModel_1.default.find(query)
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email")
            .sort({ createdAt: -1 });
        // Usar toJSON() que automáticamente convierte _id a id
        const formattedAutomations = automations.map((automation) => automation.toJSON());
        res.json(formattedAutomations);
    }
    catch (error) {
        console.error("Error obteniendo automatizaciones:", error);
        res.status(500).json({ error: "Error al obtener automatizaciones" });
    }
});
exports.getAutomations = getAutomations;
// Obtener una automatización por ID
const getAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const automation = yield AutomationModel_1.default.findById(id)
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");
        if (!automation) {
            return res.status(404).json({ error: "Automatización no encontrada" });
        }
        res.json(automation.toJSON());
    }
    catch (error) {
        console.error("Error obteniendo automatización:", error);
        res.status(500).json({ error: "Error al obtener automatización" });
    }
});
exports.getAutomation = getAutomation;
// Crear nueva automatización
const createAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const user = yield UserModel_1.default.findById(userId);
        if (!user) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }
        const organization = yield OrganizationModel_1.default.findOne({
            employees: user._id,
        });
        if (!organization) {
            return res.status(404).json({ error: "Organización no encontrada" });
        }
        // Detectar el tipo de automatización basado en los nodos
        let automationType = req.body.automationType || "workflow";
        let triggerType = req.body.triggerType || "manual";
        // Si viene del editor visual, detectar automáticamente
        if (req.body.nodes && req.body.nodes.length > 0) {
            const triggerNode = req.body.nodes.find((n) => n.type === "trigger");
            if (triggerNode) {
                // Detectar si es una automatización de conversación
                if (triggerNode.module === "whatsapp" ||
                    (triggerNode.data && triggerNode.data.message)) {
                    automationType = "conversation";
                }
                // Detectar el tipo de trigger
                switch (triggerNode.module) {
                    case "whatsapp":
                        if (triggerNode.event === "conversation_started") {
                            triggerType = "conversation_started";
                        }
                        else if (triggerNode.event === "keyword") {
                            triggerType = "keyword";
                        }
                        else {
                            triggerType = "message_received";
                        }
                        break;
                    case "webhook":
                        triggerType = "webhook";
                        break;
                    case "deal":
                    case "deals":
                        triggerType = "deal";
                        break;
                    case "contact":
                    case "contacts":
                        triggerType = "contact";
                        break;
                    case "task":
                    case "tasks":
                        triggerType = "task";
                        break;
                    default:
                        triggerType = "manual";
                }
            }
        }
        const newAutomation = yield AutomationModel_1.default.create(Object.assign(Object.assign({}, req.body), { organizationId: organization._id, createdBy: user._id, automationType,
            triggerType, isActive: req.body.isActive || false, status: req.body.isActive ? "active" : "inactive", stats: {
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
            } }));
        const populated = yield AutomationModel_1.default.findById(newAutomation._id).populate("createdBy", "name email");
        res.status(201).json(populated === null || populated === void 0 ? void 0 : populated.toJSON());
    }
    catch (error) {
        console.error("Error creando automatización:", error);
        res.status(500).json({ error: "Error al crear automatización" });
    }
});
exports.createAutomation = createAutomation;
// Actualizar automatización
const updateAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        // Si se están actualizando los nodos, recalcular el tipo
        if (req.body.nodes) {
            const triggerNode = req.body.nodes.find((n) => n.type === "trigger");
            if (triggerNode) {
                // Detectar si es una automatización de conversación
                if (triggerNode.module === "whatsapp" ||
                    (triggerNode.data && triggerNode.data.message)) {
                    req.body.automationType = "conversation";
                }
                // Actualizar el triggerType basado en el nodo
                switch (triggerNode.module) {
                    case "whatsapp":
                        if (triggerNode.event === "conversation_started") {
                            req.body.triggerType = "conversation_started";
                        }
                        else if (triggerNode.event === "keyword") {
                            req.body.triggerType = "keyword";
                        }
                        else {
                            req.body.triggerType = "message_received";
                        }
                        break;
                    case "webhook":
                        req.body.triggerType = "webhook";
                        break;
                    case "deal":
                    case "deals":
                        req.body.triggerType = "deal";
                        break;
                    case "contact":
                    case "contacts":
                        req.body.triggerType = "contact";
                        break;
                    case "task":
                    case "tasks":
                        req.body.triggerType = "task";
                        break;
                    default:
                        req.body.triggerType = "manual";
                }
            }
        }
        // Actualizar status basado en isActive
        if (req.body.isActive !== undefined) {
            req.body.status = req.body.isActive ? "active" : "inactive";
        }
        const automation = yield AutomationModel_1.default.findByIdAndUpdate(id, Object.assign(Object.assign({}, req.body), { updatedBy: userId }), { new: true })
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");
        if (!automation) {
            return res.status(404).json({ error: "Automatización no encontrada" });
        }
        res.json(automation.toJSON());
    }
    catch (error) {
        console.error("Error actualizando automatización:", error);
        res.status(500).json({ error: "Error al actualizar automatización" });
    }
});
exports.updateAutomation = updateAutomation;
// Eliminar automatización
const deleteAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const automation = yield AutomationModel_1.default.findByIdAndDelete(id);
        if (!automation) {
            return res.status(404).json({ error: "Automatización no encontrada" });
        }
        res.json({ message: "Automatización eliminada exitosamente" });
    }
    catch (error) {
        console.error("Error eliminando automatización:", error);
        res.status(500).json({ error: "Error al eliminar automatización" });
    }
});
exports.deleteAutomation = deleteAutomation;
// Alternar estado activo/inactivo
const toggleAutomationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const automation = yield AutomationModel_1.default.findById(id);
        if (!automation) {
            return res.status(404).json({ error: "Automatización no encontrada" });
        }
        automation.isActive = !automation.isActive;
        automation.status = automation.isActive ? "active" : "inactive";
        yield automation.save();
        const populated = yield AutomationModel_1.default.findById(automation._id)
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");
        res.json(populated === null || populated === void 0 ? void 0 : populated.toJSON());
    }
    catch (error) {
        console.error("Error alternando estado de automatización:", error);
        res
            .status(500)
            .json({ error: "Error al cambiar estado de automatización" });
    }
});
exports.toggleAutomationStatus = toggleAutomationStatus;
// Ejecutar automatización manualmente (para pruebas)
const executeAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { testData } = req.body;
        const automation = yield AutomationModel_1.default.findById(id);
        if (!automation) {
            return res.status(404).json({ error: "Automatización no encontrada" });
        }
        // Importar el ejecutor apropiado según el tipo
        if (automation.automationType === "conversation") {
            const { AutomationExecutor } = yield Promise.resolve().then(() => __importStar(require("../services/automations/automationExecutor")));
            // Crear contexto de prueba para conversación
            const testContext = {
                conversationId: (testData === null || testData === void 0 ? void 0 : testData.conversationId) || "test_conversation",
                organizationId: automation.organizationId.toString(),
                contactNumber: (testData === null || testData === void 0 ? void 0 : testData.contactNumber) || "34600000000",
                lastMessage: (testData === null || testData === void 0 ? void 0 : testData.message) || "Test message",
                variables: {
                    contact_name: (testData === null || testData === void 0 ? void 0 : testData.contactName) || "Test User",
                    message: (testData === null || testData === void 0 ? void 0 : testData.message) || "Test message",
                    timestamp: new Date().toISOString(),
                },
            };
            // Ejecutar la automatización
            yield AutomationExecutor.executeAutomation(automation, testContext);
        }
        else {
            // Para automatizaciones visuales/workflow, usar el servicio de ejecución existente
            // TODO: Implementar ejecución para automatizaciones de workflow
            console.log("Ejecución de automatizaciones de workflow no implementada aún");
        }
        // Actualizar estadísticas
        automation.stats = automation.stats || {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
        };
        automation.stats.totalExecutions++;
        automation.stats.lastExecutedAt = new Date();
        automation.lastRun = new Date();
        automation.runsCount = (automation.runsCount || 0) + 1;
        yield automation.save();
        res.json({
            message: "Automatización ejecutada exitosamente",
            testData,
        });
    }
    catch (error) {
        console.error("Error ejecutando automatización:", error);
        res.status(500).json({ error: "Error al ejecutar automatización" });
    }
});
exports.executeAutomation = executeAutomation;
// Obtener historial de ejecuciones
const getExecutionHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const automation = yield AutomationModel_1.default.findById(id).select("stats automationType");
        if (!automation) {
            return res.status(404).json({ error: "Automatización no encontrada" });
        }
        // Por ahora devolvemos las estadísticas
        // En el futuro podríamos tener un modelo separado para el historial detallado
        res.json({
            stats: automation.stats,
            automationType: automation.automationType,
            history: [], // TODO: Implementar historial detallado
        });
    }
    catch (error) {
        console.error("Error obteniendo historial:", error);
        res.status(500).json({ error: "Error al obtener historial" });
    }
});
exports.getExecutionHistory = getExecutionHistory;
