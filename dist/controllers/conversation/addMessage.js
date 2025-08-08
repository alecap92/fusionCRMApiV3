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
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const createConversation_1 = require("../../services/conversations/createConversation");
/**
 * Agrega un nuevo mensaje a una conversación
 */
const addMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        console.log("[ADD_MESSAGE] Iniciando guardado de mensaje manual");
        const { conversationId } = req.params;
        const { from, to, message, mediaUrl, mediaId, type, direction, latitude, longitude, replyToMessage, messageId, } = req.body;
        console.log(`[ADD_MESSAGE] Datos recibidos: 
      - From: ${from}
      - To: ${to}
      - Type: ${type}
      - Direction: ${direction}
      - MessageId: ${messageId}
      - ConversationId: ${conversationId}
    `);
        const organizationId = req.organization;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Validaciones básicas
        if (!from || !to || !message || !type || !direction) {
            return res.status(400).json({
                success: false,
                message: "Se requieren los campos from, to, message, type y direction",
            });
        }
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
        // Si es un mensaje entrante, verificar si la conversación debe reabrirse
        if (direction === "incoming") {
            yield (0, createConversation_1.reopenConversationIfClosed)(conversation);
        }
        // Verificar si ya existe un mensaje con el mismo messageId
        if (messageId) {
            const existingMessage = yield MessageModel_1.default.findOne({
                messageId,
                organization: organizationId,
            });
            if (existingMessage) {
                console.log(`[ADD_MESSAGE] Mensaje duplicado detectado, messageId: ${messageId}`);
                return res.status(409).json({
                    success: false,
                    message: "Mensaje duplicado",
                });
            }
        }
        // Crear el nuevo mensaje
        console.log("[ADD_MESSAGE] Creando nuevo mensaje en la base de datos");
        const newMessage = new MessageModel_1.default({
            user: userId,
            organization: organizationId,
            from,
            to,
            message,
            mediaUrl,
            mediaId,
            latitude,
            longitude,
            timestamp: new Date(),
            type,
            direction,
            isRead: direction === "outgoing", // Los mensajes salientes se marcan como leídos automáticamente
            replyToMessage,
            messageId,
            conversation: conversationId,
        });
        yield newMessage.save();
        console.log(`[ADD_MESSAGE] Mensaje guardado exitosamente con ID: ${newMessage._id}`);
        // Actualizar la conversación con la referencia al último mensaje
        console.log("[ADD_MESSAGE] Actualizando conversación con el nuevo mensaje");
        conversation.lastMessage = newMessage._id;
        conversation.lastMessageTimestamp = newMessage.timestamp;
        // Si es un mensaje entrante, incrementar el contador de no leídos
        if (direction === "incoming") {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }
        // Si falta displayInfo del contacto, intentar enriquecerlo mínimamente (solo mobile)
        try {
            const ref = (_c = (_b = conversation === null || conversation === void 0 ? void 0 : conversation.participants) === null || _b === void 0 ? void 0 : _b.contact) === null || _c === void 0 ? void 0 : _c.reference;
            if (ref && !((_f = (_e = (_d = conversation === null || conversation === void 0 ? void 0 : conversation.participants) === null || _d === void 0 ? void 0 : _d.contact) === null || _e === void 0 ? void 0 : _e.displayInfo) === null || _f === void 0 ? void 0 : _f.mobile)) {
                conversation.participants.contact.displayInfo = Object.assign(Object.assign({}, conversation.participants.contact.displayInfo), { mobile: ref });
            }
        }
        catch (e) {
            console.warn("[ADD_MESSAGE] No se pudo enriquecer displayInfo:", e);
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
                    currentStage: conversation.currentStage,
                    isResolved: conversation.isResolved,
                },
            },
            message: "Mensaje agregado exitosamente",
        });
    }
    catch (error) {
        console.error("Error al agregar mensaje:", error);
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
    try {
        const { conversationId } = req.params;
        const organizationId = req.organization;
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
