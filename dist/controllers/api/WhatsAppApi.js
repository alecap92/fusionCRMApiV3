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
exports.sendMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const IntegrationsModel_1 = __importDefault(require("../../models/IntegrationsModel"));
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
const socket_1 = require("../../config/socket");
const apiUrl = process.env.WHATSAPP_API_URL;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { message, to, type = "text", mediaUrl, caption, organizationId, } = req.body;
        // Validación básica
        if (!to || !organizationId) {
            return res.status(400).json({
                success: false,
                message: "Faltan parámetros obligatorios: to, organizationId",
            });
        }
        if (type === "text" && !message) {
            return res.status(400).json({
                success: false,
                message: "El mensaje de texto es requerido para tipo 'text'",
            });
        }
        // Validar que el tipo esté definido
        if (!type) {
            return res.status(400).json({
                success: false,
                message: "El tipo de mensaje es requerido",
            });
        }
        // Normalizar el tipo (en caso de que venga con espacios o mayúsculas)
        const normalizedType = type.toString().toLowerCase().trim();
        // Buscar organización
        const organization = yield OrganizationModel_1.default.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organización no encontrada",
            });
        }
        // Buscar integración de WhatsApp
        const integration = yield IntegrationsModel_1.default.findOne({
            organizationId: organizationId,
            service: "whatsapp",
        });
        if (!integration) {
            return res.status(404).json({
                success: false,
                message: "Integración de WhatsApp no encontrada para esta organización",
            });
        }
        if (!((_a = integration.credentials) === null || _a === void 0 ? void 0 : _a.numberIdIdentifier) ||
            !((_b = integration.credentials) === null || _b === void 0 ? void 0 : _b.accessToken)) {
            return res.status(400).json({
                success: false,
                message: "Credenciales de WhatsApp incompletas",
            });
        }
        const { numberIdIdentifier, accessToken, phoneNumber } = integration.credentials;
        const whatsappApiUrl = `${apiUrl}/${numberIdIdentifier}/messages`;
        // Construir payload según el tipo de mensaje
        let payload;
        let messageText = "";
        console.log("🔍 WhatsApp API Debug:", {
            type,
            normalizedType,
            typeOf: typeof type,
            to,
            message,
            mediaUrl,
            caption,
            organizationId,
        });
        switch (normalizedType) {
            case "text":
                console.log("📝 Procesando mensaje de texto");
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    text: { body: message },
                };
                messageText = message;
                break;
            case "image":
                console.log("🖼️ Procesando mensaje de imagen");
                if (!mediaUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "URL de imagen requerida para tipo 'image'",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "image", // ← AGREGAR ESTE CAMPO
                    image: {
                        link: mediaUrl,
                        caption: caption || "",
                    },
                    message: "imagen", // ← AGREGAR ESTE CAMPO
                };
                messageText = caption || "[Imagen]";
                break;
            case "document":
                console.log("📄 Procesando mensaje de documento");
                if (!mediaUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "URL de documento requerida para tipo 'document'",
                    });
                }
                // Validar que la URL sea accesible directamente (no Google Drive)
                if (mediaUrl.includes("drive.google.com")) {
                    return res.status(400).json({
                        success: false,
                        message: "WhatsApp API no acepta URLs de Google Drive directamente. Usa una URL directa al archivo.",
                        suggestion: "Sube el archivo a un servidor web o usa un servicio como AWS S3, Cloudinary, etc.",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "document", // ← AGREGAR ESTE CAMPO
                    document: {
                        link: mediaUrl,
                        caption: caption || "",
                    },
                    message: "documento", // ← AGREGAR ESTE CAMPO
                };
                messageText = caption || "[Documento]";
                break;
            case "audio":
                console.log("🎵 Procesando mensaje de audio");
                if (!mediaUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "URL de audio requerida para tipo 'audio'",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "audio", // ← AGREGAR ESTE CAMPO
                    audio: {
                        link: mediaUrl,
                    },
                    message: "audio", // ← AGREGAR ESTE CAMPO
                };
                messageText = "[Audio]";
                break;
            case "video":
                console.log("🎥 Procesando mensaje de video");
                if (!mediaUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "URL de video requerida para tipo 'video'",
                    });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "video", // ← AGREGAR ESTE CAMPO
                    video: {
                        link: mediaUrl,
                        caption: caption || "",
                    },
                    message: "video", // ← AGREGAR ESTE CAMPO
                };
                messageText = caption || "[Video]";
                break;
            default:
                console.log("❌ Tipo de mensaje no reconocido:", type, "| Normalizado:", normalizedType);
                return res.status(400).json({
                    success: false,
                    message: "Tipo de mensaje no soportado. Tipos válidos: text, image, document, audio, video",
                });
        }
        console.log("📤 Payload a enviar:", JSON.stringify(payload, null, 2));
        console.log("🔍 Tipo procesado:", type, "| Normalizado:", normalizedType, "| Payload type:", typeof payload);
        // Validar que el payload se construyó correctamente
        if (!payload || !payload.messaging_product) {
            return res.status(500).json({
                success: false,
                message: "Error interno: payload no se construyó correctamente",
                debug: { type, normalizedType, payload },
            });
        }
        // Enviar mensaje a WhatsApp API
        const response = yield axios_1.default.post(whatsappApiUrl, payload, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const messageId = (_e = (_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.messages) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.id;
        if (!messageId) {
            return res.status(500).json({
                success: false,
                message: "Error al enviar mensaje a WhatsApp",
            });
        }
        // Buscar o crear conversación
        let conversation = yield ConversationModel_1.default.findOne({
            organization: organizationId,
            "participants.contact.reference": to,
        });
        // Validar ventana de 24 horas si la conversación existe
        if (conversation && conversation.lastMessageTimestamp) {
            const now = new Date();
            const lastMessageTime = new Date(conversation.lastMessageTimestamp);
            const hoursDifference = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
            if (hoursDifference > 24) {
                return res.status(400).json({
                    success: false,
                    message: "No se puede enviar mensajes después de 24 horas del último mensaje. Meta WhatsApp Business API no permite mensajes fuera de la ventana de 24 horas.",
                    details: {
                        lastMessageTime: lastMessageTime.toISOString(),
                        hoursDifference: Math.round(hoursDifference * 100) / 100,
                        maxAllowedHours: 24,
                    },
                });
            }
        }
        if (!conversation) {
            // Obtener pipeline por defecto
            const defaultPipeline = yield ConversationPipelineModel_1.default.findOne({
                organization: organizationId,
                isDefault: true,
            });
            if (!defaultPipeline) {
                return res.status(400).json({
                    success: false,
                    message: "No se encontró un pipeline por defecto para la organización",
                });
            }
            // Crear nueva conversación
            conversation = yield ConversationModel_1.default.create({
                title: `Conversación con ${to}`,
                organization: organizationId,
                participants: {
                    user: {
                        type: "User",
                        reference: organization.employees[0] || organization._id, // Usar primer empleado o la organización
                    },
                    contact: {
                        type: "Contact",
                        reference: to,
                    },
                },
                pipeline: defaultPipeline._id,
                currentStage: 0,
                assignedTo: organization.employees[0] || organization._id,
                priority: "medium",
                firstContactTimestamp: new Date(),
                metadata: [
                    {
                        key: "origen",
                        value: "api",
                    },
                ],
                isArchived: false,
                unreadCount: 0,
            });
        }
        // Crear mensaje en la base de datos
        const outgoingMessage = yield MessageModel_1.default.create({
            user: organization.employees[0] || organization._id,
            organization: organizationId,
            from: phoneNumber || "",
            to,
            message: messageText,
            direction: "outgoing",
            type,
            mediaUrl: mediaUrl || "",
            timestamp: new Date(),
            messageId: messageId,
            conversation: conversation._id,
        });
        // Actualizar conversación
        yield ConversationModel_1.default.findByIdAndUpdate(conversation._id, {
            lastMessage: outgoingMessage._id,
            lastMessageTimestamp: outgoingMessage.timestamp,
            unreadCount: 0, // Resetear contador cuando se envía mensaje saliente
        }, { new: true });
        // Emitir evento de socket
        const io = (0, socket_1.getSocketInstance)();
        io.emit("newMessage", Object.assign(Object.assign({}, outgoingMessage.toObject()), { direction: "outgoing" }));
        return res.status(200).json({
            success: true,
            data: {
                messageId: messageId,
                conversationId: conversation._id,
                message: outgoingMessage,
            },
            message: "Mensaje enviado exitosamente",
        });
    }
    catch (error) {
        console.error("Error enviando mensaje WhatsApp:", error);
        // Manejo de errores específicos de WhatsApp API
        if ((_f = error.response) === null || _f === void 0 ? void 0 : _f.data) {
            const whatsappError = error.response.data;
            console.log("🚨 Error de WhatsApp API:", JSON.stringify(whatsappError, null, 2));
            return res.status(error.response.status || 500).json({
                success: false,
                message: "Error de WhatsApp API",
                error: whatsappError,
                details: {
                    status: error.response.status,
                    url: (_g = error.config) === null || _g === void 0 ? void 0 : _g.url,
                    payload: (_h = error.config) === null || _h === void 0 ? void 0 : _h.data,
                },
            });
        }
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor",
            error: error.message,
        });
    }
});
exports.sendMessage = sendMessage;
