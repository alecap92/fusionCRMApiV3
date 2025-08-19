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
exports.getUnreadMessagesCount = exports.markConversationAsRead = exports.addMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const IntegrationsModel_1 = __importDefault(require("../../models/IntegrationsModel"));
const createConversation_1 = require("../../services/conversations/createConversation");
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Agrega un nuevo mensaje a una conversación
 */
const addMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    try {
        const { conversationId } = req.params;
        const { from, to, message, mediaUrl, mediaId, type, direction, latitude, longitude, replyToMessage, messageId, filename, mimeType, } = req.body;
        // Validación y trazas mínimas
        logger_1.default.info("[ADD_MESSAGE] Inicio solicitud", {
            conversationId,
            direction,
            type,
            hasMessage: Boolean(message && String(message).trim()),
            hasMediaUrl: Boolean(mediaUrl),
            hasMediaId: Boolean(mediaId),
            to,
            replyToMessage: replyToMessage || null,
            messageId: messageId || null,
            filename: filename || null,
            mimeType: mimeType || null,
        });
        const organizationId = ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.organizationId) || (req === null || req === void 0 ? void 0 : req.organization);
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        logger_1.default.info("[ADD_MESSAGE] Contexto de seguridad", {
            organizationId,
            userId,
        });
        // Validaciones básicas
        if (!to || !type || !direction) {
            logger_1.default.warn("[ADD_MESSAGE] Faltan campos requeridos", {
                missingTo: !to,
                missingType: !type,
                missingDirection: !direction,
            });
            return res.status(400).json({
                success: false,
                message: "Se requieren los campos to, type y direction",
            });
        }
        if (!message && !mediaUrl) {
            logger_1.default.warn("[ADD_MESSAGE] Faltan contenido de mensaje o mediaUrl");
            return res.status(400).json({
                success: false,
                message: "Se requiere 'message' o 'mediaUrl'",
            });
        }
        // Verificar que la conversación existe
        const conversation = yield ConversationModel_1.default.findOne({
            _id: conversationId,
            organization: organizationId,
        });
        logger_1.default.info("[ADD_MESSAGE] Verificación de conversación", {
            conversationId,
            organizationId,
            found: Boolean(conversation),
        });
        if (!conversation) {
            logger_1.default.warn("[ADD_MESSAGE] Conversación no encontrada", {
                conversationId,
                organizationId,
            });
            return res.status(404).json({
                success: false,
                message: "Conversación no encontrada",
            });
        }
        // Si es un mensaje entrante, verificar si la conversación debe reabrirse
        if (direction === "incoming") {
            logger_1.default.info("[ADD_MESSAGE] Mensaje entrante: reabrir conversación si aplica", {
                conversationId,
            });
            yield (0, createConversation_1.reopenConversationIfClosed)(conversation);
        }
        // Verificar si ya existe un mensaje con el mismo messageId
        if (messageId) {
            const existingMessage = yield MessageModel_1.default.findOne({
                messageId,
                organization: organizationId,
            });
            if (existingMessage) {
                logger_1.default.warn("[ADD_MESSAGE] Mensaje duplicado detectado", {
                    messageId,
                    organizationId,
                });
                return res.status(409).json({
                    success: false,
                    message: "Mensaje duplicado",
                });
            }
        }
        // Si es un mensaje saliente, intentar enviarlo por la API de WhatsApp antes de guardar
        let outgoingMessageId;
        let senderPhoneNumber;
        if (direction === "outgoing") {
            // Buscar integración de WhatsApp
            logger_1.default.info("[ADD_MESSAGE] Mensaje saliente: consultando integración de WhatsApp", {
                organizationId,
            });
            const integration = yield IntegrationsModel_1.default.findOne({
                organizationId: organizationId,
                service: "whatsapp",
            });
            if (!integration) {
                logger_1.default.warn("[ADD_MESSAGE] Integración de WhatsApp no encontrada", {
                    organizationId,
                });
                return res.status(400).json({
                    success: false,
                    message: "Integración de WhatsApp no encontrada",
                });
            }
            const apiUrl = process.env.WHATSAPP_API_URL;
            const phoneNumberId = (_c = integration.credentials) === null || _c === void 0 ? void 0 : _c.numberIdIdentifier;
            const accessToken = (_d = integration.credentials) === null || _d === void 0 ? void 0 : _d.accessToken;
            senderPhoneNumber = ((_e = integration.credentials) === null || _e === void 0 ? void 0 : _e.phoneNumber) || undefined;
            if (!apiUrl || !phoneNumberId || !accessToken) {
                logger_1.default.warn("[ADD_MESSAGE] Credenciales de WhatsApp incompletas", {
                    hasApiUrl: Boolean(apiUrl),
                    hasPhoneNumberId: Boolean(phoneNumberId),
                    hasAccessToken: Boolean(accessToken),
                });
                return res.status(400).json({
                    success: false,
                    message: "Credenciales de WhatsApp incompletas",
                });
            }
            const whatsappApiUrl = `${apiUrl}/${phoneNumberId}/messages`;
            logger_1.default.info("[ADD_MESSAGE] Enviando a WhatsApp API", {
                whatsappApiUrl,
                type,
                to,
                hasMediaUrl: Boolean(mediaUrl),
            });
            // Construir payload según el tipo
            let payload;
            try {
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
                            document: Object.assign(Object.assign({ link: mediaUrl }, (message ? { caption: message } : {})), (filename ? { filename } : {})),
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
                            audio: {
                                link: mediaUrl,
                            },
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
                logger_1.default.info("[ADD_MESSAGE] WhatsApp API respuesta", {
                    status: response.status,
                    messageId: ((_h = (_g = (_f = response.data) === null || _f === void 0 ? void 0 : _f.messages) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.id) || null,
                });
                outgoingMessageId = (_l = (_k = (_j = response.data) === null || _j === void 0 ? void 0 : _j.messages) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.id;
            }
            catch (sendError) {
                const status = ((_m = sendError === null || sendError === void 0 ? void 0 : sendError.response) === null || _m === void 0 ? void 0 : _m.status) || 500;
                const details = ((_o = sendError === null || sendError === void 0 ? void 0 : sendError.response) === null || _o === void 0 ? void 0 : _o.data) || { message: sendError === null || sendError === void 0 ? void 0 : sendError.message };
                logger_1.default.error("[ADD_MESSAGE] Error al enviar mensaje a WhatsApp", {
                    status,
                    details,
                });
                return res.status(status).json({
                    success: false,
                    message: "Error al enviar mensaje a WhatsApp",
                    details,
                });
            }
        }
        // Crear el nuevo mensaje
        // Creando nuevo mensaje en la base de datos
        const effectiveFrom = from || senderPhoneNumber || (direction === "outgoing" ? to : to);
        logger_1.default.info("[ADD_MESSAGE] Determinación del remitente (from)", {
            providedFrom: from || null,
            senderPhoneNumber: senderPhoneNumber || null,
            effectiveFrom,
        });
        const newMessage = new MessageModel_1.default({
            user: userId,
            organization: organizationId,
            from: effectiveFrom,
            to,
            message,
            mediaUrl,
            mediaId,
            filename,
            mimeType,
            latitude,
            longitude,
            timestamp: new Date(),
            type,
            direction,
            isRead: direction === "outgoing", // Los mensajes salientes se marcan como leídos automáticamente
            replyToMessage,
            messageId: messageId || outgoingMessageId,
            conversation: conversationId,
        });
        yield newMessage.save();
        logger_1.default.info("[ADD_MESSAGE] Mensaje guardado", {
            messageDbId: newMessage === null || newMessage === void 0 ? void 0 : newMessage._id,
            conversationId,
            direction,
            type,
        });
        // Actualizar la conversación con la referencia al último mensaje
        // Actualizando conversación con el nuevo mensaje
        conversation.lastMessage = newMessage._id;
        conversation.lastMessageTimestamp = newMessage.timestamp;
        // Si es un mensaje entrante, incrementar el contador de no leídos
        if (direction === "incoming") {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }
        else if (direction === "outgoing") {
            // Si es un mensaje saliente, resetear el contador de no leídos
            conversation.unreadCount = 0;
        }
        // Si falta displayInfo del contacto, intentar enriquecerlo mínimamente (solo mobile)
        try {
            const ref = (_q = (_p = conversation === null || conversation === void 0 ? void 0 : conversation.participants) === null || _p === void 0 ? void 0 : _p.contact) === null || _q === void 0 ? void 0 : _q.reference;
            if (ref && !((_t = (_s = (_r = conversation === null || conversation === void 0 ? void 0 : conversation.participants) === null || _r === void 0 ? void 0 : _r.contact) === null || _s === void 0 ? void 0 : _s.displayInfo) === null || _t === void 0 ? void 0 : _t.mobile)) {
                conversation.participants.contact.displayInfo = Object.assign(Object.assign({}, conversation.participants.contact.displayInfo), { mobile: ref });
            }
        }
        catch (e) {
            console.warn("[ADD_MESSAGE] No se pudo enriquecer displayInfo:", e);
        }
        yield conversation.save();
        logger_1.default.info("[ADD_MESSAGE] Conversación actualizada", {
            conversationId: conversation._id,
            lastMessageTimestamp: conversation.lastMessageTimestamp,
            unreadCount: conversation.unreadCount,
        });
        return res.status(201).json({
            success: true,
            data: {
                message: newMessage,
                conversation: {
                    _id: conversation._id,
                    lastMessageTimestamp: conversation.lastMessageTimestamp,
                    unreadCount: conversation.unreadCount,
                    currentStage: conversation.currentStage,
                    isResolved: conversation.isResolved,
                },
            },
            message: "Mensaje agregado exitosamente",
        });
    }
    catch (error) {
        logger_1.default.error("[ADD_MESSAGE] Error no controlado", {
            error: error === null || error === void 0 ? void 0 : error.message,
            stack: error === null || error === void 0 ? void 0 : error.stack,
        });
        return res.status(500).json({
            success: false,
            message: "Error al agregar mensaje",
            error: error.message,
        });
    }
});
exports.addMessage = addMessage;
/**
 * Marca todos los mensajes de una conversación como leídos
 */
const markConversationAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { conversationId } = req.params;
        // Algunos middlewares adjuntan la organización como req.user.organizationId.
        // Aseguramos compatibilidad tomando primero la de usuario y luego el fallback.
        const organizationId = ((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.organizationId) || (req === null || req === void 0 ? void 0 : req.organization);
        // Verificar que la conversación existe
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
        // Marcar todos los mensajes entrantes como leídos
        yield MessageModel_1.default.updateMany({
            conversation: conversationId,
            direction: "incoming",
            isRead: false,
        }, { isRead: true });
        // Resetear el contador de no leídos de la conversación
        conversation.unreadCount = 0;
        yield conversation.save();
        return res.status(200).json({
            success: true,
            message: "Conversación marcada como leída",
        });
    }
    catch (error) {
        console.error("Error al marcar conversación como leída:", error);
        return res.status(500).json({
            success: false,
            message: "Error al marcar conversación como leída",
            error: error.message,
        });
    }
});
exports.markConversationAsRead = markConversationAsRead;
/**
 * Obtiene los mensajes no leídos pendientes para un usuario
 */
const getUnreadMessagesCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = req.organization;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Contar conversaciones con mensajes no leídos asignadas al usuario
        const unreadConversations = yield ConversationModel_1.default.countDocuments({
            organization: organizationId,
            assignedTo: userId,
            unreadCount: { $gt: 0 },
        });
        // Contar total de mensajes no leídos asignados al usuario
        const totalUnreadMessages = yield ConversationModel_1.default.aggregate([
            {
                $match: {
                    organization: organizationId,
                    assignedTo: userId,
                    unreadCount: { $gt: 0 },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$unreadCount" },
                },
            },
        ]);
        const totalCount = totalUnreadMessages.length > 0 ? totalUnreadMessages[0].total : 0;
        return res.status(200).json({
            success: true,
            data: {
                unreadConversations,
                totalUnreadMessages: totalCount,
            },
        });
    }
    catch (error) {
        console.error("Error al obtener conteo de mensajes no leídos:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener conteo de mensajes no leídos",
            error: error.message,
        });
    }
});
exports.getUnreadMessagesCount = getUnreadMessagesCount;
