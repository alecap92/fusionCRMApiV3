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
exports.sendCustomMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const UserModel_1 = __importDefault(require("../../../models/UserModel"));
const OrganizationModel_1 = __importDefault(require("../../../models/OrganizationModel"));
const MessageModel_1 = __importDefault(require("../../../models/MessageModel")); // Importar el MessageModel unificado
const socket_1 = require("../../../config/socket");
const IntegrationsModel_1 = __importDefault(require("../../../models/IntegrationsModel"));
const ConversationModel_1 = __importDefault(require("../../../models/ConversationModel"));
const createConversation_1 = require("../../../services/conversations/createConversation");
const ConversationPipelineModel_1 = __importDefault(require("../../../models/ConversationPipelineModel"));
const apiUrl = process.env.WHATSAPP_API_URL;
const sendCustomMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("[SEND_CUSTOM] Iniciando envío de mensaje personalizado");
        const { message, to, type: messageType, mediaUrl, file } = req.body;
        console.log(`[SEND_CUSTOM] Datos recibidos:
      - To: ${to}
      - Type: ${messageType}
      - MediaUrl: ${mediaUrl || "N/A"}
    `);
        if (!to || !messageType || (messageType === "text" && !message)) {
            console.error("[SEND_CUSTOM] Faltan parámetros requeridos");
            return res.status(400).json({ error: "Missing required parameters" });
        }
        if (!req.user) {
            console.error("[SEND_CUSTOM] Usuario no encontrado");
            return res.status(401).json({ error: "User not found" });
        }
        const user = yield UserModel_1.default.findById(req.user._id);
        if (!user) {
            console.error("User not found");
            return res.status(400).json({ error: "User not found" });
        }
        const organization = yield OrganizationModel_1.default.findOne({
            employees: user._id,
        });
        if (!organization) {
            console.error("Organization not found");
            return res.status(400).json({ error: "Organization not found" });
        }
        const token = req.headers.authorization;
        if (!token) {
            console.error("Authorization token missing");
            return res.status(401).json({ error: "Authorization token missing" });
        }
        const integration = yield IntegrationsModel_1.default.findOne({
            organizationId: organization._id,
            service: "whatsapp",
        });
        if (!integration) {
            console.error("Integration not found");
            return res.status(400).json({ error: "Integration not found" });
        }
        const { accessToken, numberIdIdentifier } = integration.credentials;
        const whatsappApiUrl = `${apiUrl}/${numberIdIdentifier}/messages`;
        let payload;
        // Switch para definir el tipo de mensaje
        switch (messageType) {
            case "text":
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    text: { body: message },
                };
                break;
            case "image":
                if (!mediaUrl) {
                    return res
                        .status(400)
                        .json({ error: "mediaUrl is required for image messages" });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "image",
                    image: {
                        link: mediaUrl,
                        caption: "", // Caption es opcional
                    },
                    message: "imagen",
                };
                break;
            case "document":
                if (!mediaUrl && !file) {
                    return res.status(400).json({
                        error: "Se requiere un archivo o mediaUrl para mensajes de tipo document",
                    });
                }
                // Validar el tipo de archivo si se está subiendo uno nuevo
                if (file) {
                    const allowedDocumentTypes = [
                        "application/pdf",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.ms-excel",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "text/plain",
                        "text/csv",
                    ];
                    if (!allowedDocumentTypes.includes(file.mimetype)) {
                        return res.status(400).json({
                            error: "Tipo de archivo no permitido para documentos",
                            allowedTypes: allowedDocumentTypes,
                        });
                    }
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "document",
                    document: {
                        link: mediaUrl || "", // Usar mediaUrl si existe, sino ""
                        caption: "",
                    },
                    message: "documento",
                };
                break;
            case "video":
                if (!mediaUrl) {
                    return res
                        .status(400)
                        .json({ error: "mediaUrl is required for video messages" });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "video",
                    video: {
                        link: mediaUrl,
                        caption: "", // Caption es opcional
                    },
                    message: "video",
                };
                break;
            case "audio":
                if (!mediaUrl) {
                    return res
                        .status(400)
                        .json({ error: "mediaUrl is required for audio messages" });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "audio",
                    audio: {
                        link: mediaUrl,
                    },
                    message: "audio",
                };
                break;
            default:
                return res.status(400).json({ error: "Unsupported message type" });
        }
        let response;
        try {
            // Llamada a la API de WhatsApp con manejo de errores específico
            response = yield axios_1.default.post(whatsappApiUrl, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        }
        catch (axiosError) {
            // Procesamiento detallado del error de la API
            const errorResponse = axiosError.response;
            if (errorResponse && errorResponse.data) {
                console.error("WhatsApp API Error:", errorResponse.data);
                // Extraer mensaje de error específico si está disponible
                let errorMessage = "Error al enviar mensaje a WhatsApp";
                let errorDetails = {};
                if (errorResponse.data.error) {
                    if (typeof errorResponse.data.error === "string") {
                        errorMessage = errorResponse.data.error;
                    }
                    else if (errorResponse.data.error.message) {
                        errorMessage = errorResponse.data.error.message;
                        errorDetails = {
                            code: errorResponse.data.error.code || "",
                            type: errorResponse.data.error.type || "",
                            subcode: errorResponse.data.error.error_subcode || "",
                        };
                    }
                }
                return res.status(errorResponse.status || 500).json({
                    error: errorMessage,
                    details: errorDetails,
                    payload: payload, // Devolver el payload para depuración
                    statusCode: errorResponse.status,
                });
            }
            // Error genérico si no hay respuesta estructurada
            console.error("Error calling WhatsApp API:", axiosError.message);
            return res.status(500).json({
                error: "Error al conectar con la API de WhatsApp",
                message: axiosError.message,
                payload: payload,
            });
        }
        const messageId = (_a = response.data.messages[0]) === null || _a === void 0 ? void 0 : _a.id;
        let conversation = yield ConversationModel_1.default.findOne({
            organization: organization._id,
            "participants.contact.reference": to, // Buscar por la referencia del contacto
        });
        if (!conversation) {
            const conversationPipeline = yield ConversationPipelineModel_1.default.findOne({
                organization: organization._id,
            });
            if (!conversationPipeline) {
                return res.status(500).json({
                    error: "Error al crear la conversación",
                });
            }
            const newConversation = yield (0, createConversation_1.createConversation)({
                organizationId: organization._id,
                userId: user._id.toString(),
                to,
                pipelineId: conversationPipeline._id,
                assignedTo: user._id.toString(),
            });
            if (!newConversation) {
                return res.status(500).json({
                    error: "Error al crear la conversación",
                });
            }
            conversation = newConversation;
        }
        if (response.status === 200 || response.status === 201) {
            console.log("[SEND_CUSTOM] Mensaje enviado exitosamente a WhatsApp API");
            // Verificar si ya existe un mensaje con este ID
            if (messageId) {
                const existingMessage = yield MessageModel_1.default.findOne({
                    messageId,
                    organization: organization._id,
                });
                if (existingMessage) {
                    console.log(`[SEND_CUSTOM] Mensaje duplicado detectado, messageId: ${messageId}`);
                    return res.status(409).json({ error: "Mensaje duplicado" });
                }
            }
            console.log("[SEND_CUSTOM] Guardando mensaje en la base de datos");
            // Crear y almacenar el mensaje usando el nuevo MessageModel
            const outgoingMessage = yield MessageModel_1.default.create({
                user: user._id,
                organization: organization._id,
                from: integration.credentials.phoneNumber || "",
                to,
                message: messageType === "text" ? message : mediaUrl,
                direction: "outgoing",
                type: messageType,
                mediaUrl: mediaUrl || "",
                timestamp: new Date().toISOString(),
                messageId: messageId,
                conversation: conversation === null || conversation === void 0 ? void 0 : conversation._id,
            });
            console.log(`[SEND_CUSTOM] Mensaje guardado exitosamente con ID: ${outgoingMessage._id}`);
            console.log("[SEND_CUSTOM] Emitiendo evento de socket");
            const io = (0, socket_1.getSocketInstance)();
            io.emit("newMessage", Object.assign(Object.assign({}, outgoingMessage.toObject()), { direction: "outgoing" }));
            return res.status(200).json(outgoingMessage);
        }
        else {
            console.error("[SEND_CUSTOM] Error en respuesta de WhatsApp API:", response.data);
            return res
                .status(500)
                .json({ error: "Error sending message", details: response.data });
        }
    }
    catch (error) {
        console.error("[SEND_CUSTOM] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.sendCustomMessage = sendCustomMessage;
