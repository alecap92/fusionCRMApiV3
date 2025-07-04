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
exports.AutomationExecutor = void 0;
const AutomationModel_1 = __importDefault(require("../../models/AutomationModel"));
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const automationService_1 = require("../conversations/automationService");
class AutomationExecutor {
    /**
     * Procesa un mensaje entrante y ejecuta automatizaciones relevantes
     */
    static processIncomingMessage(conversationId_1, organizationId_1, contactNumber_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, organizationId, contactNumber, message, isFirstMessage = false) {
            try {
                console.log(`[AutomationExecutor] Procesando mensaje: "${message}" de ${contactNumber}`);
                // Buscar automatizaciones activas de tipo conversación para esta organización
                const automations = yield AutomationModel_1.default.find({
                    organizationId,
                    isActive: true,
                    automationType: { $in: ["conversation", null] }, // null para compatibilidad con antiguas
                    $or: [
                        { triggerType: "message_received" },
                        { triggerType: "conversation_started" },
                        { triggerType: "keyword" },
                        { triggerType: "whatsapp_message" }, // Nuevo trigger específico
                        // También buscar por nodos para automatizaciones visuales
                        { "nodes.type": "trigger", "nodes.module": "whatsapp" },
                    ],
                });
                console.log(`[AutomationExecutor] Encontradas ${automations.length} automatizaciones activas`);
                // Buscar conversación
                const conversation = yield ConversationModel_1.default.findById(conversationId);
                if (!conversation) {
                    console.error("Conversación no encontrada");
                    return;
                }
                // Verificar si las automatizaciones están activas para esta conversación
                const automationSettings = conversation.automationSettings || {
                    isPaused: false,
                };
                if (automationSettings.isPaused) {
                    console.log(`[AutomationExecutor] Automatizaciones pausadas para conversación ${conversationId}`);
                    return;
                }
                // Contexto para la ejecución
                const context = {
                    conversationId,
                    organizationId,
                    contactNumber,
                    lastMessage: message,
                    isFirstMessage,
                    variables: {
                        contact_name: contactNumber,
                        message,
                        timestamp: new Date().toISOString(),
                    },
                };
                // Ejecutar cada automatización que coincida
                for (const automation of automations) {
                    const shouldExecute = yield this.shouldExecuteAutomation(automation, context);
                    if (shouldExecute) {
                        console.log(`[AutomationExecutor] Ejecutando automatización: ${automation.name}`);
                        yield this.executeAutomation(automation, context);
                    }
                }
            }
            catch (error) {
                console.error("[AutomationExecutor] Error procesando mensaje entrante:", error);
            }
        });
    }
    /**
     * Determina si una automatización debe ejecutarse basándose en el contexto
     */
    static shouldExecuteAutomation(automation, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Para automatizaciones del editor visual, verificar el nodo trigger
            if (automation.nodes && automation.nodes.length > 0) {
                const triggerNode = automation.nodes.find((n) => n.type === "trigger");
                if (triggerNode && triggerNode.module === "whatsapp") {
                    // Verificar el evento del trigger
                    if (triggerNode.event === "conversation_started" &&
                        !context.isFirstMessage) {
                        return false;
                    }
                    if (triggerNode.event === "keyword" && ((_a = triggerNode.data) === null || _a === void 0 ? void 0 : _a.keywords)) {
                        const keywords = Array.isArray(triggerNode.data.keywords)
                            ? triggerNode.data.keywords
                            : [];
                        const messageWords = context.lastMessage.toLowerCase().split(/\s+/);
                        const hasKeyword = keywords.some((keyword) => messageWords.includes(keyword.toLowerCase()));
                        if (!hasKeyword)
                            return false;
                    }
                    // Para message_received, siempre ejecutar (a menos que sea conversation_started)
                    return true;
                }
            }
            // Lógica original para automatizaciones no visuales
            switch (automation.triggerType) {
                case "conversation_started":
                    return context.isFirstMessage;
                case "keyword":
                    if (!((_b = automation.triggerConditions) === null || _b === void 0 ? void 0 : _b.keywords))
                        return false;
                    const messageWords = context.lastMessage.toLowerCase().split(/\s+/);
                    return automation.triggerConditions.keywords.some((keyword) => messageWords.includes(keyword.toLowerCase()));
                case "message_received":
                    return true;
                default:
                    return false;
            }
        });
    }
    /**
     * Ejecuta una automatización completa
     */
    static executeAutomation(automation, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                console.log(`[AutomationExecutor] Iniciando ejecución: ${automation.name}`);
                // Verificar si se puede ejecutar basándose en el historial
                const conversation = yield ConversationModel_1.default.findById(context.conversationId);
                if (!conversation) {
                    console.error("Conversación no encontrada");
                    return;
                }
                // Verificar duplicados
                const canTrigger = yield automationService_1.AutomationService.canTriggerAutomation({
                    conversationId: context.conversationId,
                    automationType: ((_a = automation._id) === null || _a === void 0 ? void 0 : _a.toString()) || "",
                });
                if (!canTrigger) {
                    console.log(`[AutomationExecutor] Automatización ya ejecutada recientemente, omitiendo`);
                    return;
                }
                // Si la automatización tiene nodos (editor visual), ejecutar flujo de nodos
                if (automation.nodes && automation.nodes.length > 0) {
                    yield this.executeNodeFlow(automation, context);
                }
                else {
                    // Ejecutar flujo antiguo basado en código
                    yield this.executeLegacyFlow(automation, context);
                }
                // Registrar la ejecución
                yield automationService_1.AutomationService.recordAutomationTriggered(context.conversationId, ((_b = automation._id) === null || _b === void 0 ? void 0 : _b.toString()) || "");
                // Actualizar estadísticas
                yield this.updateAutomationStats(((_c = automation._id) === null || _c === void 0 ? void 0 : _c.toString()) || "", true);
            }
            catch (error) {
                console.error(`[AutomationExecutor] Error ejecutando automatización ${automation.name}:`, error);
                // Actualizar estadísticas de error
                yield this.updateAutomationStats(((_d = automation._id) === null || _d === void 0 ? void 0 : _d.toString()) || "", false);
            }
        });
    }
    /**
     * Ejecuta un flujo basado en nodos del editor visual
     */
    static executeNodeFlow(automation, context) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AutomationExecutor] Ejecutando flujo visual con ${automation.nodes.length} nodos`);
            // Encontrar el nodo trigger
            const triggerNode = automation.nodes.find((n) => n.type === "trigger");
            if (!triggerNode) {
                console.error("No se encontró nodo trigger");
                return;
            }
            // Ejecutar desde el trigger
            yield this.executeNodeRecursive(triggerNode, automation.nodes, context);
        });
    }
    /**
     * Ejecuta un nodo y sus siguientes de forma recursiva
     */
    static executeNodeRecursive(node, allNodes, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log(`[AutomationExecutor] Ejecutando nodo: ${node.id} (${node.type})`);
            // Ejecutar según el tipo de nodo
            switch (node.type) {
                case "trigger":
                    // Los triggers no ejecutan acciones, solo inician el flujo
                    break;
                case "action":
                    yield this.executeActionNode(node, context);
                    break;
                case "condition":
                    const conditionMet = yield this.evaluateCondition(node, context);
                    const nextNodeId = conditionMet ? node.trueBranch : node.falseBranch;
                    if (nextNodeId) {
                        const nextNode = allNodes.find((n) => n.id === nextNodeId);
                        if (nextNode) {
                            yield this.executeNodeRecursive(nextNode, allNodes, context);
                        }
                    }
                    return; // Las condiciones manejan su propio flujo
                case "delay":
                    const delayMs = (((_a = node.data) === null || _a === void 0 ? void 0 : _a.delay) || 5) * 1000;
                    console.log(`[AutomationExecutor] Esperando ${delayMs}ms`);
                    yield new Promise((resolve) => setTimeout(resolve, delayMs));
                    break;
            }
            // Ejecutar nodos siguientes (para nodos que no son condiciones)
            if (node.next && node.next.length > 0) {
                for (const nextId of node.next) {
                    const nextNode = allNodes.find((n) => n.id === nextId);
                    if (nextNode) {
                        yield this.executeNodeRecursive(nextNode, allNodes, context);
                    }
                }
            }
        });
    }
    /**
     * Ejecuta un nodo de acción
     */
    static executeActionNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Manejar nodos del editor visual
            if (node.module === "whatsapp" || node.module === "send_whatsapp") {
                const message = this.processTemplate(((_a = node.data) === null || _a === void 0 ? void 0 : _a.message) || "", context.variables);
                console.log(`[AutomationExecutor] Enviando mensaje WhatsApp: "${message}" a ${context.contactNumber}`);
                try {
                    // Importar el helper de WhatsApp
                    const { sendWhatsAppMessage } = yield Promise.resolve().then(() => __importStar(require("./whatsappHelper")));
                    // Buscar la integración de WhatsApp para obtener las credenciales
                    const IntegrationsModel = (yield Promise.resolve().then(() => __importStar(require("../../models/IntegrationsModel")))).default;
                    const integration = yield IntegrationsModel.findOne({
                        organizationId: context.organizationId,
                        service: "whatsapp",
                    });
                    if (!integration) {
                        console.error("No se encontró integración de WhatsApp");
                        return;
                    }
                    // Enviar el mensaje
                    const messageId = yield sendWhatsAppMessage({
                        to: context.contactNumber,
                        message,
                        accessToken: integration.credentials.accessToken,
                        phoneNumberId: integration.credentials.numberIdIdentifier,
                    });
                    if (!messageId) {
                        console.error("Error al enviar mensaje de WhatsApp");
                        return;
                    }
                    // Registrar el mensaje en la base de datos
                    const MessageModel = (yield Promise.resolve().then(() => __importStar(require("../../models/MessageModel"))))
                        .default;
                    const UserModel = (yield Promise.resolve().then(() => __importStar(require("../../models/UserModel")))).default;
                    const OrganizationModel = (yield Promise.resolve().then(() => __importStar(require("../../models/OrganizationModel")))).default;
                    const org = yield OrganizationModel.findById(context.organizationId);
                    const systemUserId = org === null || org === void 0 ? void 0 : org.employees[0];
                    yield MessageModel.create({
                        user: systemUserId,
                        conversation: context.conversationId,
                        organization: context.organizationId,
                        from: "system",
                        to: context.contactNumber,
                        message: message,
                        type: "text",
                        direction: "outgoing",
                        timestamp: new Date(),
                        messageId: `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    });
                }
                catch (error) {
                    console.error("Error enviando mensaje de WhatsApp:", error);
                }
            }
            else if (node.module === "email" || node.module === "send_email") {
                // Manejar envío de email
                console.log(`[AutomationExecutor] Enviando email (no implementado aún)`);
                // TODO: Implementar envío de email
            }
            else if (node.module === "webhook" || node.module === "http_request") {
                // Manejar webhook/HTTP request
                console.log(`[AutomationExecutor] Ejecutando HTTP request (no implementado aún)`);
                // TODO: Implementar HTTP request
            }
        });
    }
    /**
     * Ejecuta el flujo antiguo (para compatibilidad)
     */
    static executeLegacyFlow(automation, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Por ahora, ejecutar una acción simple basada en el tipo
            if (automation.triggerType === "conversation_started") {
                yield this.executeAction({
                    id: "legacy_action",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "¡Hola! Bienvenido a nuestro servicio. ¿En qué puedo ayudarte hoy?",
                    },
                }, context);
            }
        });
    }
    /**
     * Ejecuta una acción (enviar mensaje, etc.)
     */
    static executeAction(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (node.module === "whatsapp" && node.event === "send_message") {
                const message = this.processTemplate(((_a = node.data) === null || _a === void 0 ? void 0 : _a.message) || "", context.variables);
                console.log(`[AutomationExecutor] Enviando mensaje WhatsApp: "${message}" a ${context.contactNumber}`);
                try {
                    // Importar el helper de WhatsApp
                    const { sendWhatsAppMessage } = yield Promise.resolve().then(() => __importStar(require("./whatsappHelper")));
                    // Buscar la integración de WhatsApp para obtener las credenciales
                    const IntegrationsModel = (yield Promise.resolve().then(() => __importStar(require("../../models/IntegrationsModel")))).default;
                    const integration = yield IntegrationsModel.findOne({
                        organizationId: context.organizationId,
                        service: "whatsapp",
                    });
                    if (!integration) {
                        console.error("[AutomationExecutor] No se encontró integración de WhatsApp");
                        return;
                    }
                    // Enviar el mensaje real
                    const messageId = yield sendWhatsAppMessage({
                        to: context.contactNumber,
                        message: message,
                        accessToken: integration.credentials.accessToken,
                        phoneNumberId: integration.credentials.numberIdIdentifier,
                    });
                    console.log(`[AutomationExecutor] Mensaje enviado exitosamente a ${context.contactNumber}, ID: ${messageId}`);
                }
                catch (error) {
                    console.error(`[AutomationExecutor] Error enviando mensaje WhatsApp:`, error);
                }
                // Registrar el mensaje en la base de datos
                const UserModel = (yield Promise.resolve().then(() => __importStar(require("../../models/UserModel")))).default;
                const OrganizationModel = (yield Promise.resolve().then(() => __importStar(require("../../models/OrganizationModel"))))
                    .default;
                const org = yield OrganizationModel.findById(context.organizationId);
                const systemUserId = org === null || org === void 0 ? void 0 : org.employees[0];
                yield MessageModel_1.default.create({
                    user: systemUserId,
                    conversation: context.conversationId,
                    organization: context.organizationId,
                    from: "system",
                    to: context.contactNumber,
                    message: message,
                    type: "text",
                    direction: "outgoing",
                    timestamp: new Date(),
                    messageId: `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                });
            }
            else if (node.module === "system" && node.event === "notify_team") {
                // Notificar al equipo
                console.log(`[AutomationExecutor] Notificando al equipo: ${((_b = node.data) === null || _b === void 0 ? void 0 : _b.message) || "Cliente requiere atención"}`);
                try {
                    // Actualizar la conversación para marcarla como prioritaria
                    const ConversationModel = (yield Promise.resolve().then(() => __importStar(require("../../models/ConversationModel")))).default;
                    yield ConversationModel.findByIdAndUpdate(context.conversationId, {
                        priority: "high",
                        $push: {
                            "automationSettings.automationHistory": {
                                automationType: "team_notification",
                                triggeredAt: new Date(),
                            },
                        },
                    });
                    // Emitir notificación por socket
                    const { getSocketInstance } = yield Promise.resolve().then(() => __importStar(require("../../config/socket")));
                    const io = getSocketInstance();
                    io.to(`organization_${context.organizationId}`).emit("automation_notification", {
                        type: "team_notification",
                        conversationId: context.conversationId,
                        message: ((_c = node.data) === null || _c === void 0 ? void 0 : _c.message) || "Cliente requiere atención humana",
                        contactNumber: context.contactNumber,
                        timestamp: new Date(),
                    });
                    console.log("[AutomationExecutor] Notificación enviada al equipo");
                }
                catch (error) {
                    console.error("[AutomationExecutor] Error notificando al equipo:", error);
                }
            }
        });
    }
    /**
     * Evalúa una condición
     */
    static evaluateCondition(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const condition = (_a = node.data) === null || _a === void 0 ? void 0 : _a.condition;
            if (!condition)
                return false;
            const fieldValue = this.getFieldValue(condition.field, context);
            const compareValue = condition.value;
            switch (condition.operator) {
                case "equals":
                    return fieldValue === compareValue;
                case "contains":
                    return String(fieldValue)
                        .toLowerCase()
                        .includes(String(compareValue).toLowerCase());
                case "starts_with":
                    return String(fieldValue)
                        .toLowerCase()
                        .startsWith(String(compareValue).toLowerCase());
                case "ends_with":
                    return String(fieldValue)
                        .toLowerCase()
                        .endsWith(String(compareValue).toLowerCase());
                case "regex":
                    try {
                        const regex = new RegExp(compareValue, "i");
                        return regex.test(String(fieldValue));
                    }
                    catch (_b) {
                        return false;
                    }
                default:
                    return false;
            }
        });
    }
    /**
     * Obtiene el valor de un campo del contexto
     */
    static getFieldValue(field, context) {
        if (field === "message")
            return context.lastMessage;
        if (field.startsWith("variables.")) {
            const varName = field.substring(10);
            return context.variables[varName];
        }
        return null;
    }
    /**
     * Procesa un template reemplazando variables
     */
    static processTemplate(template, variables) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return variables[varName] || match;
        });
    }
    static updateAutomationStats(automationId, isSuccessful) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementa la lógica para actualizar las estadísticas de la automatización en la base de datos
        });
    }
}
exports.AutomationExecutor = AutomationExecutor;
