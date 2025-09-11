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
exports.getDealInfo = exports.getContactInfo = exports.getConversationInfo = exports.createActivityFromN8n = exports.updateDealFromN8n = exports.createDealFromN8n = exports.updateContactFromN8n = exports.createContactFromN8n = exports.updateConversationStatus = exports.addMessageToConversation = exports.createConversationFromN8n = exports.sendWhatsAppMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const IntegrationsModel_1 = __importDefault(require("../../models/IntegrationsModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
const mongoose_1 = require("mongoose");
const createConversation_1 = require("../../services/conversations/createConversation");
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Envía un mensaje de WhatsApp desde n8n
 * POST /api/v1/n8n/integrations/webhooks/whatsapp/send
 */
const sendWhatsAppMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { to, message, mediaUrl, type = "text", conversationId, createIfNotExists = true, } = req.body;
        const organizationId = req.organizationId;
        logger_1.default.info("[N8N_WHATSAPP] Inicio de envío de mensaje", {
            to,
            type,
            hasMessage: Boolean(message),
            hasMediaUrl: Boolean(mediaUrl),
            conversationId,
            createIfNotExists,
        });
        // Validaciones básicas
        if (!to || (!message && !mediaUrl)) {
            return res.status(400).json({
                success: false,
                message: "Se requieren 'to' y 'message' o 'mediaUrl'",
            });
        }
        // Buscar integración de WhatsApp
        const integration = yield IntegrationsModel_1.default.findOne({
            organizationId: organizationId,
            service: "whatsapp",
        });
        if (!integration) {
            return res.status(400).json({
                success: false,
                message: "Integración de WhatsApp no encontrada",
            });
        }
        const apiUrl = process.env.WHATSAPP_API_URL;
        const phoneNumberId = (_a = integration.credentials) === null || _a === void 0 ? void 0 : _a.numberIdIdentifier;
        const accessToken = (_b = integration.credentials) === null || _b === void 0 ? void 0 : _b.accessToken;
        const senderPhoneNumber = (_c = integration.credentials) === null || _c === void 0 ? void 0 : _c.phoneNumber;
        if (!apiUrl || !phoneNumberId || !accessToken) {
            return res.status(400).json({
                success: false,
                message: "Credenciales de WhatsApp incompletas",
            });
        }
        // Buscar o crear conversación
        let conversation;
        if (conversationId) {
            conversation = yield ConversationModel_1.default.findOne({
                _id: conversationId,
                organization: organizationId,
            });
            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: "Conversación no encontrada",
                });
            }
        }
        else {
            // Buscar conversación existente por número de teléfono
            conversation = yield ConversationModel_1.default.findOne({
                organization: organizationId,
                "participants.contact.reference": to,
            });
            if (!conversation && createIfNotExists) {
                // Crear nueva conversación solo si no existe y se permite
                const defaultPipelineId = yield getDefaultPipelineId(organizationId);
                const defaultUserId = yield getDefaultUserId(organizationId);
                // Generar título descriptivo para la conversación
                let conversationTitle = `Conversación con ${to}`;
                if (message && message.trim()) {
                    // Si hay mensaje, usar las primeras palabras como título
                    const messagePreview = message.trim().substring(0, 50);
                    conversationTitle = `${messagePreview}${message.length > 50 ? "..." : ""} - ${to}`;
                }
                else if (mediaUrl) {
                    // Si es un archivo, usar el tipo y nombre del archivo
                    const fileName = ((_d = mediaUrl.split("/").pop()) === null || _d === void 0 ? void 0 : _d.split("?")[0]) || "archivo";
                    conversationTitle = `${type.toUpperCase()}: ${fileName} - ${to}`;
                }
                conversation = yield ConversationModel_1.default.create({
                    title: conversationTitle,
                    organization: organizationId,
                    participants: {
                        user: {
                            type: "User",
                            reference: defaultUserId,
                        },
                        contact: {
                            type: "Contact",
                            reference: to,
                        },
                    },
                    pipeline: defaultPipelineId,
                    currentStage: 0,
                    assignedTo: defaultUserId,
                    priority: "medium",
                    firstContactTimestamp: new Date(),
                });
                logger_1.default.info("[N8N_WHATSAPP] Nueva conversación creada", {
                    conversationId: conversation._id,
                    title: conversationTitle,
                    type,
                    hasMessage: Boolean(message),
                    hasMediaUrl: Boolean(mediaUrl),
                });
            }
            else if (!conversation && !createIfNotExists) {
                return res.status(404).json({
                    success: false,
                    message: "Conversación no encontrada y createIfNotExists es false",
                });
            }
            else {
                logger_1.default.info("[N8N_WHATSAPP] Conversación existente encontrada", {
                    conversationId: conversation._id,
                    title: conversation.title,
                    existingMessages: conversation.messageCount || 0,
                });
            }
        }
        // Enviar mensaje a WhatsApp
        const whatsappApiUrl = `${apiUrl}/${phoneNumberId}/messages`;
        let payload;
        switch (type) {
            case "text":
                if (!message) {
                    return res.status(400).json({
                        success: false,
                        message: "El campo 'message' es requerido para mensajes de texto",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    text: { body: message },
                };
                break;
            case "image":
                if (!mediaUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "'mediaUrl' es requerido para mensajes de imagen",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "image",
                    image: Object.assign({ link: mediaUrl }, (message ? { caption: message } : {})),
                };
                break;
            case "document":
                if (!mediaUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "'mediaUrl' es requerido para mensajes de documento",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "document",
                    document: Object.assign({ link: mediaUrl }, (message ? { caption: message } : {})),
                };
                break;
            case "video":
                if (!mediaUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "'mediaUrl' es requerido para mensajes de video",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "video",
                    video: Object.assign({ link: mediaUrl }, (message ? { caption: message } : {})),
                };
                break;
            case "audio":
                if (!mediaUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "'mediaUrl' es requerido para mensajes de audio",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "audio",
                    audio: { link: mediaUrl },
                };
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: "Tipo de mensaje no soportado",
                });
        }
        const response = yield axios_1.default.post(whatsappApiUrl, payload, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const outgoingMessageId = (_g = (_f = (_e = response.data) === null || _e === void 0 ? void 0 : _e.messages) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.id;
        // Guardar mensaje en la base de datos
        const newMessage = new MessageModel_1.default({
            user: conversation.assignedTo || (yield getDefaultUserId(organizationId)),
            organization: organizationId,
            from: senderPhoneNumber || to,
            to,
            message,
            mediaUrl,
            type,
            direction: "outgoing",
            isRead: true,
            messageId: outgoingMessageId,
            conversation: conversation._id,
            timestamp: new Date(),
        });
        yield newMessage.save();
        // Actualizar conversación
        conversation.lastMessage = newMessage._id;
        conversation.lastMessageTimestamp = newMessage.timestamp;
        conversation.unreadCount = 0;
        yield conversation.save();
        logger_1.default.info("[N8N_WHATSAPP] Mensaje enviado exitosamente", {
            messageId: newMessage._id,
            conversationId: conversation._id,
            whatsappMessageId: outgoingMessageId,
        });
        return res.status(201).json({
            success: true,
            data: {
                message: newMessage,
                conversation: {
                    _id: conversation._id,
                    lastMessageTimestamp: conversation.lastMessageTimestamp,
                    unreadCount: conversation.unreadCount,
                },
                whatsappMessageId: outgoingMessageId,
            },
            message: "Mensaje enviado exitosamente",
        });
    }
    catch (error) {
        logger_1.default.error("[N8N_WHATSAPP] Error al enviar mensaje", {
            error: error === null || error === void 0 ? void 0 : error.message,
            stack: error === null || error === void 0 ? void 0 : error.stack,
        });
        return res.status(500).json({
            success: false,
            message: "Error al enviar mensaje",
            error: error.message,
        });
    }
});
exports.sendWhatsAppMessage = sendWhatsAppMessage;
/**
 * Crea una conversación desde n8n
 * POST /api/v1/n8n/integrations/webhooks/conversations/create
 */
const createConversationFromN8n = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { to, title, priority = "medium", assignedTo, pipelineId } = req.body;
        const organizationId = req.organizationId;
        if (!to) {
            return res.status(400).json({
                success: false,
                message: "El campo 'to' es requerido",
            });
        }
        const conversation = yield ConversationModel_1.default.create({
            title: title || `Conversación con ${to}`,
            organization: organizationId,
            participants: {
                user: {
                    type: "User",
                    reference: assignedTo || (yield getDefaultUserId(organizationId)),
                },
                contact: {
                    type: "Contact",
                    reference: to,
                },
            },
            pipeline: pipelineId || (yield getDefaultPipelineId(organizationId)),
            currentStage: 0,
            assignedTo: assignedTo || (yield getDefaultUserId(organizationId)),
            priority,
            firstContactTimestamp: new Date(),
        });
        return res.status(201).json({
            success: true,
            data: conversation,
            message: "Conversación creada exitosamente",
        });
    }
    catch (error) {
        logger_1.default.error("[N8N_CONVERSATION_CREATE] Error al crear conversación", {
            error: error === null || error === void 0 ? void 0 : error.message,
        });
        return res.status(500).json({
            success: false,
            message: "Error al crear conversación",
            error: error.message,
        });
    }
});
exports.createConversationFromN8n = createConversationFromN8n;
/**
 * Agrega un mensaje a una conversación existente desde n8n
 * POST /api/v1/n8n/integrations/webhooks/conversations/:conversationId/messages
 */
const addMessageToConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const { message, mediaUrl, type = "text", direction = "incoming", } = req.body;
        const organizationId = req.organizationId;
        if (!message && !mediaUrl) {
            return res.status(400).json({
                success: false,
                message: "Se requiere 'message' o 'mediaUrl'",
            });
        }
        const conversation = yield ConversationModel_1.default.findOne({
            _id: conversationId,
            organization: organizationId,
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversación no encontrada",
            });
        }
        // Si es un mensaje entrante, reabrir conversación si es necesario
        if (direction === "incoming") {
            yield (0, createConversation_1.reopenConversationIfClosed)(conversation);
        }
        // Determinar el remitente y destinatario correctamente
        const contactPhone = conversation.participants.contact.reference;
        const from = direction === "outgoing" ? contactPhone : contactPhone;
        const to = direction === "outgoing" ? contactPhone : contactPhone;
        const newMessage = new MessageModel_1.default({
            user: conversation.assignedTo || (yield getDefaultUserId(organizationId)),
            organization: organizationId,
            from,
            to,
            message,
            mediaUrl,
            type,
            direction,
            isRead: direction === "outgoing",
            conversation: conversationId,
            timestamp: new Date(),
        });
        yield newMessage.save();
        // Actualizar conversación
        conversation.lastMessage = newMessage._id;
        conversation.lastMessageTimestamp = newMessage.timestamp;
        if (direction === "incoming") {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }
        else {
            conversation.unreadCount = 0;
        }
        yield conversation.save();
        return res.status(201).json({
            success: true,
            data: {
                message: newMessage,
                conversation: {
                    _id: conversation._id,
                    lastMessageTimestamp: conversation.lastMessageTimestamp,
                    unreadCount: conversation.unreadCount,
                },
            },
            message: "Mensaje agregado exitosamente",
        });
    }
    catch (error) {
        logger_1.default.error("[N8N_MESSAGE_ADD] Error al agregar mensaje", {
            error: error === null || error === void 0 ? void 0 : error.message,
        });
        return res.status(500).json({
            success: false,
            message: "Error al agregar mensaje",
            error: error.message,
        });
    }
});
exports.addMessageToConversation = addMessageToConversation;
/**
 * Actualiza el estado de una conversación desde n8n
 * PUT /api/v1/n8n/integrations/webhooks/conversations/:conversationId/status
 */
const updateConversationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const { currentStage, isResolved, assignedTo, priority, tags } = req.body;
        const organizationId = req.organizationId;
        const conversation = yield ConversationModel_1.default.findOne({
            _id: conversationId,
            organization: organizationId,
        });
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversación no encontrada",
            });
        }
        // Actualizar campos si están presentes
        if (currentStage !== undefined)
            conversation.currentStage = currentStage;
        if (isResolved !== undefined)
            conversation.isResolved = isResolved;
        if (assignedTo !== undefined)
            conversation.assignedTo = assignedTo;
        if (priority !== undefined)
            conversation.priority = priority;
        if (tags !== undefined)
            conversation.tags = tags;
        yield conversation.save();
        return res.status(200).json({
            success: true,
            data: conversation,
            message: "Estado de conversación actualizado exitosamente",
        });
    }
    catch (error) {
        logger_1.default.error("[N8N_CONVERSATION_STATUS] Error al actualizar estado", {
            error: error === null || error === void 0 ? void 0 : error.message,
        });
        return res.status(500).json({
            success: false,
            message: "Error al actualizar estado de conversación",
            error: error.message,
        });
    }
});
exports.updateConversationStatus = updateConversationStatus;
/**
 * Obtiene el ID del pipeline por defecto de una organización
 * @param organizationId - ID de la organización
 * @returns Promise<Types.ObjectId> - ID del pipeline por defecto
 */
function getDefaultPipelineId(organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Buscar el pipeline por defecto de la organización
            const defaultPipeline = yield ConversationPipelineModel_1.default.findOne({
                organization: organizationId,
                isDefault: true,
            });
            if (defaultPipeline) {
                return defaultPipeline._id;
            }
            // Si no hay pipeline por defecto, buscar el primero disponible
            const firstPipeline = yield ConversationPipelineModel_1.default.findOne({
                organization: organizationId,
            });
            if (firstPipeline) {
                return firstPipeline._id;
            }
            // Si no hay ningún pipeline, crear uno básico por defecto
            const newDefaultPipeline = yield ConversationPipelineModel_1.default.create({
                name: "Pipeline por Defecto",
                organization: organizationId,
                isDefault: true,
                stages: [
                    { name: "Sin Atender", order: 0, color: "#6B7280" },
                    { name: "En Proceso", order: 1, color: "#3B82F6" },
                    { name: "Resuelto", order: 2, color: "#10B981" },
                ],
            });
            return newDefaultPipeline._id;
        }
        catch (error) {
            logger_1.default.error("[GET_DEFAULT_PIPELINE] Error obteniendo pipeline por defecto", {
                organizationId,
                error: error instanceof Error ? error.message : "Error desconocido",
            });
            // En caso de error, retornar un ObjectId por defecto
            // Esto permitirá que la conversación se cree, aunque sin pipeline específico
            return new mongoose_1.Types.ObjectId();
        }
    });
}
/**
 * Obtiene el ID del usuario por defecto de una organización
 * @param organizationId - ID de la organización
 * @returns Promise<Types.ObjectId> - ID del usuario por defecto
 */
function getDefaultUserId(organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Por ahora retornamos un ObjectId por defecto
            // En el futuro, podrías buscar el primer usuario de la organización
            // o un usuario específico configurado como por defecto
            return new mongoose_1.Types.ObjectId();
        }
        catch (error) {
            logger_1.default.error("[GET_DEFAULT_USER] Error obteniendo usuario por defecto", {
                organizationId,
                error: error instanceof Error ? error.message : "Error desconocido",
            });
            return new mongoose_1.Types.ObjectId();
        }
    });
}
// Placeholder functions para los demás endpoints
const createContactFromN8n = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implementar creación de contactos
    res
        .status(501)
        .json({ success: false, message: "Endpoint no implementado aún" });
});
exports.createContactFromN8n = createContactFromN8n;
const updateContactFromN8n = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implementar actualización de contactos
    res
        .status(501)
        .json({ success: false, message: "Endpoint no implementado aún" });
});
exports.updateContactFromN8n = updateContactFromN8n;
const createDealFromN8n = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implementar creación de deals
    res
        .status(501)
        .json({ success: false, message: "Endpoint no implementado aún" });
});
exports.createDealFromN8n = createDealFromN8n;
const updateDealFromN8n = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implementar actualización de deals
    res
        .status(501)
        .json({ success: false, message: "Endpoint no implementado aún" });
});
exports.updateDealFromN8n = updateDealFromN8n;
const createActivityFromN8n = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implementar creación de actividades
    res
        .status(501)
        .json({ success: false, message: "Endpoint no implementado aún" });
});
exports.createActivityFromN8n = createActivityFromN8n;
const getConversationInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implementar obtención de información de conversación
    res
        .status(501)
        .json({ success: false, message: "Endpoint no implementado aún" });
});
exports.getConversationInfo = getConversationInfo;
const getContactInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implementar obtención de información de contacto
    res
        .status(501)
        .json({ success: false, message: "Endpoint no implementado aún" });
});
exports.getContactInfo = getContactInfo;
const getDealInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implementar obtención de información de deal
    res
        .status(501)
        .json({ success: false, message: "Endpoint no implementado aún" });
});
exports.getDealInfo = getDealInfo;
