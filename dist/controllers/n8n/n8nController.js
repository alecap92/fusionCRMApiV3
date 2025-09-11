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
exports.executeN8nAutomation = exports.deleteN8nAutomation = exports.updateN8nAutomation = exports.createN8nAutomation = exports.getN8nAutomation = exports.getN8nAutomations = void 0;
const N8nModel_1 = __importDefault(require("../../models/N8nModel"));
const conversationMessagesService_1 = require("../../services/conversationMessagesService");
// 🔍 Obtener todas las automatizaciones n8n de la organización
const getN8nAutomations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const n8nAutomations = yield N8nModel_1.default.find()
            .populate("userId", "name email") // Opcional: mostrar info del usuario que lo creó
            .sort({ createdAt: -1 }); // Ordenar por fecha de creación, más recientes primero
        res.status(200).json({
            success: true,
            data: n8nAutomations,
            count: n8nAutomations.length,
        });
    }
    catch (error) {
        console.error("Error al obtener automatizaciones n8n:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener automatizaciones n8n",
        });
    }
});
exports.getN8nAutomations = getN8nAutomations;
// 🔍 Obtener una automatización n8n específica
const getN8nAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id; // Solo para logs
        console.log(`[N8N] Usuario ${userId} solicitando automatización ${id} para organización ${organizationId}`);
        const n8nAutomation = yield N8nModel_1.default.findOne({
            _id: id,
            organizationId,
        }).populate("userId", "name email");
        if (!n8nAutomation) {
            return res.status(404).json({
                success: false,
                message: "Automatización n8n no encontrada",
            });
        }
        res.status(200).json({
            success: true,
            data: n8nAutomation,
        });
    }
    catch (error) {
        console.error("Error al obtener la automatización n8n:", error);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        });
    }
});
exports.getN8nAutomation = getN8nAutomation;
// ➕ Crear nueva automatización n8n
const createN8nAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        const { endpoint, name, apiKey, method = "POST" } = req.body;
        console.log(`[N8N] Usuario ${userId} creando automatización para organización ${organizationId}`);
        if (!endpoint || !name) {
            return res.status(400).json({
                success: false,
                message: "Endpoint y nombre son requeridos",
            });
        }
        // Validar que el endpoint sea una URL válida
        try {
            new URL(endpoint);
        }
        catch (_c) {
            return res.status(400).json({
                success: false,
                message: "Endpoint debe ser una URL válida",
            });
        }
        // Verificar si ya existe una automatización con el mismo nombre en la organización
        const existingAutomation = yield N8nModel_1.default.findOne({
            organizationId,
            name: name.trim(),
        });
        if (existingAutomation) {
            return res.status(400).json({
                success: false,
                message: "Ya existe una automatización con ese nombre",
            });
        }
        const n8nAutomation = new N8nModel_1.default({
            organizationId,
            userId,
            endpoint: endpoint.trim(),
            name: name.trim(),
            apiKey: (apiKey === null || apiKey === void 0 ? void 0 : apiKey.trim()) || undefined,
            method: method.toUpperCase(),
        });
        yield n8nAutomation.save();
        console.log(`[N8N] Automatización creada exitosamente: ${n8nAutomation._id}`);
        res.status(201).json({
            success: true,
            data: n8nAutomation,
            message: "Automatización n8n creada exitosamente",
        });
    }
    catch (error) {
        console.error("Error al crear automatización n8n:", error);
        res.status(500).json({
            success: false,
            message: "Error al crear automatización n8n",
        });
    }
});
exports.createN8nAutomation = createN8nAutomation;
// ✏️ Actualizar automatización n8n
const updateN8nAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id; // Solo para logs
        const { endpoint, name, apiKey, method } = req.body;
        console.log(`[N8N] Usuario ${userId} actualizando automatización ${id} para organización ${organizationId}`);
        const n8nAutomation = yield N8nModel_1.default.findOne({
            _id: id,
            organizationId,
        });
        if (!n8nAutomation) {
            return res.status(404).json({
                success: false,
                message: "Automatización n8n no encontrada",
            });
        }
        // Validar endpoint si se proporciona
        if (endpoint) {
            try {
                new URL(endpoint);
                n8nAutomation.endpoint = endpoint.trim();
            }
            catch (_c) {
                return res.status(400).json({
                    success: false,
                    message: "Endpoint debe ser una URL válida",
                });
            }
        }
        // Validar nombre si se proporciona
        if (name) {
            const trimmedName = name.trim();
            // Verificar si ya existe otra automatización con el mismo nombre
            const existingAutomation = yield N8nModel_1.default.findOne({
                organizationId,
                name: trimmedName,
                _id: { $ne: id }, // Excluir la automatización actual
            });
            if (existingAutomation) {
                return res.status(400).json({
                    success: false,
                    message: "Ya existe una automatización con ese nombre",
                });
            }
            n8nAutomation.name = trimmedName;
        }
        // Actualizar apiKey si se proporciona
        if (apiKey !== undefined) {
            n8nAutomation.apiKey = (apiKey === null || apiKey === void 0 ? void 0 : apiKey.trim()) || undefined;
        }
        // Actualizar method si se proporciona
        if (method) {
            n8nAutomation.method = method.toUpperCase();
        }
        yield n8nAutomation.save();
        console.log(`[N8N] Automatización actualizada exitosamente: ${id}`);
        res.status(200).json({
            success: true,
            data: n8nAutomation,
            message: "Automatización n8n actualizada exitosamente",
        });
    }
    catch (error) {
        console.error("Error al actualizar automatización n8n:", error);
        res.status(500).json({
            success: false,
            message: "Error al actualizar automatización n8n",
        });
    }
});
exports.updateN8nAutomation = updateN8nAutomation;
// ❌ Eliminar automatización n8n
const deleteN8nAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id; // Solo para logs
        console.log(`[N8N] Usuario ${userId} eliminando automatización ${id} para organización ${organizationId}`);
        const n8nAutomation = yield N8nModel_1.default.findOneAndDelete({
            _id: id,
            organizationId,
        });
        if (!n8nAutomation) {
            return res.status(404).json({
                success: false,
                message: "Automatización n8n no encontrada",
            });
        }
        console.log(`[N8N] Automatización eliminada exitosamente: ${id}`);
        res.status(200).json({
            success: true,
            message: "Automatización n8n eliminada exitosamente",
        });
    }
    catch (error) {
        console.error("Error al eliminar automatización n8n:", error);
        res.status(500).json({
            success: false,
            message: "Error al eliminar automatización n8n",
        });
    }
});
exports.deleteN8nAutomation = deleteN8nAutomation;
// ===== FUNCIONES AUXILIARES =====
/**
 * Obtiene datos de contacto por número de teléfono
 */
const getContactData = (phoneNumber, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Contact = yield Promise.resolve().then(() => __importStar(require("../../models/ContactModel"))).then((module) => module.default);
        const DealsModel = yield Promise.resolve().then(() => __importStar(require("../../models/DealsModel"))).then((module) => module.default);
        console.log(`[N8N] Buscando contacto por teléfono: ${phoneNumber} en organización: ${organizationId}`);
        // Buscar contacto por número de teléfono en las propiedades
        const contact = yield Contact.findOne({
            organizationId,
            $or: [
                { "properties.value": phoneNumber },
                { mobile: phoneNumber },
                { phone: phoneNumber },
            ],
        })
            .populate("EmployeeOwner")
            .lean();
        if (!contact) {
            console.log(`[N8N] Contacto no encontrado para teléfono: ${phoneNumber}`);
            return { success: false, error: "Contacto no encontrado" };
        }
        console.log(`[N8N] Contacto encontrado: ${contact._id}`);
        // Obtener deals asociados
        const deals = yield DealsModel.find({ associatedContactId: contact._id })
            .populate("status")
            .lean();
        const totalRevenue = deals.reduce((acc, deal) => acc + (deal.amount || 0), 0);
        const lastDeal = deals.length > 0
            ? deals.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
            : null;
        return {
            success: true,
            data: {
                contact,
                deals,
                summary: {
                    totalRevenue,
                    totalDeals: deals.length,
                    lastDeal,
                },
            },
        };
    }
    catch (error) {
        console.error("Error obteniendo datos de contacto:", error);
        return { success: false, error: "Error obteniendo datos de contacto" };
    }
});
/**
 * Obtiene datos de organización/negocio
 */
const getBusinessData = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Organization = yield Promise.resolve().then(() => __importStar(require("../../models/OrganizationModel"))).then((module) => module.default);
        const organization = yield Organization.findById(organizationId)
            .populate("employees")
            .lean();
        if (!organization) {
            return { success: false, error: "Organización no encontrada" };
        }
        return {
            success: true,
            data: organization,
        };
    }
    catch (error) {
        console.error("Error obteniendo datos de organización:", error);
        return { success: false, error: "Error obteniendo datos de organización" };
    }
});
/**
 * Construye el payload según el target de la automatización
 */
const buildPayload = (automation, targets, context) => __awaiter(void 0, void 0, void 0, function* () {
    const basePayload = {
        automation: {
            id: automation._id,
            name: automation.name,
            endpoint: automation.endpoint,
            method: automation.method,
        },
        execution: {
            timestamp: new Date().toISOString(),
            userId: context.userId,
            organizationId: context.organizationId,
            source: "fusioncol-n8n-execution",
        },
    };
    const payloadData = {};
    // Obtener datos según los targets
    for (const target of targets) {
        switch (target) {
            case "Mensajes":
                const conversationData = yield (0, conversationMessagesService_1.getAllConversationMessages)(context.conversationId, context.organizationId);
                if (conversationData.success) {
                    payloadData.conversation = conversationData.data;
                }
                break;
            case "Contacto":
                if (context.contactId) {
                    console.log(`[N8N] Procesando target Contacto, phoneNumber: ${context.contactId}`);
                    const contactData = yield getContactData(context.contactId, // Ahora es el número de teléfono
                    context.organizationId);
                    if (contactData.success) {
                        payloadData.contact = contactData.data;
                        console.log(`[N8N] Datos del contacto agregados al payload`);
                    }
                    else {
                        console.log(`[N8N] Error obteniendo datos del contacto:`, contactData.error);
                    }
                }
                else {
                    console.log(`[N8N] No se proporcionó número de teléfono para target Contacto`);
                }
                break;
            case "Negocios":
                const businessData = yield getBusinessData(context.organizationId);
                if (businessData.success) {
                    payloadData.organization = businessData.data;
                }
                break;
        }
    }
    // Agregar datos adicionales si están presentes
    if (context.additionalData) {
        payloadData.additionalData = context.additionalData;
    }
    return Object.assign(Object.assign({}, basePayload), payloadData);
});
/**
 * Ejecuta la automatización HTTP
 */
const executeAutomationRequest = (automation, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const headers = {
        "Content-Type": "application/json",
    };
    if (automation.apiKey) {
        headers["Authorization"] = `Bearer ${automation.apiKey}`;
    }
    console.log(`[N8N] Enviando payload a ${automation.endpoint} con método ${automation.method}`);
    console.log(payload);
    const response = yield fetch(automation.endpoint, {
        method: automation.method,
        headers,
        body: automation.method !== "GET" ? JSON.stringify(payload) : undefined,
    });
    const responseText = yield response.text();
    let responseData;
    try {
        responseData = JSON.parse(responseText);
    }
    catch (_a) {
        responseData = { rawResponse: responseText };
    }
    return {
        success: response.ok,
        statusCode: response.status,
        data: responseData,
    };
});
// ===== FUNCIÓN PRINCIPAL =====
/**
 * Ejecuta una automatización N8N con contexto específico según el target
 * @param req - Request con automationId en params y contexto en body
 * @param res - Response para devolver el resultado
 */
const executeN8nAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { automationId } = req.params;
        const { conversationId, contactId, organizationId, userId, additionalData, } = req.body;
        console.log("Body:", req.body);
        console.log("🔍 DEBUG - contactId recibido:", contactId, "tipo:", typeof contactId);
        // ===== VALIDACIONES DE ENTRADA =====
        if (!automationId) {
            return res.status(400).json({
                success: false,
                message: "ID de automatización es requerido",
            });
        }
        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message: "ID de conversación es requerido",
            });
        }
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: "ID de organización es requerido",
            });
        }
        // ===== OBTENER AUTOMATIZACIÓN =====
        const automation = yield N8nModel_1.default.findOne({
            _id: automationId,
            organizationId,
        });
        if (!automation) {
            return res.status(404).json({
                success: false,
                message: "Automatización no encontrada",
            });
        }
        // ===== CONSTRUIR PAYLOAD SEGÚN TARGETS =====
        const payload = yield buildPayload(automation, automation.target, {
            conversationId,
            contactId,
            organizationId,
            userId,
            additionalData,
        });
        // ===== EJECUTAR AUTOMATIZACIÓN =====
        const executionResult = yield executeAutomationRequest(automation, payload);
        // ===== MANEJAR RESPUESTA =====
        if (executionResult.success) {
            console.log(`[N8N] Automatización ejecutada exitosamente: ${automationId}`);
            return res.status(200).json({
                success: true,
                message: "Automatización ejecutada exitosamente",
                data: {
                    automationId,
                    conversationId,
                    response: executionResult.data,
                    statusCode: executionResult.statusCode,
                },
            });
        }
        else {
            console.log(`[N8N] Error en automatización: ${automationId} - Status: ${executionResult.statusCode}`);
            return res.status(200).json({
                success: false,
                message: "La automatización respondió con error",
                data: {
                    automationId,
                    conversationId,
                    response: executionResult.data,
                    statusCode: executionResult.statusCode,
                },
            });
        }
    }
    catch (error) {
        console.error("Error ejecutando automatización n8n:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor",
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
});
exports.executeN8nAutomation = executeN8nAutomation;
