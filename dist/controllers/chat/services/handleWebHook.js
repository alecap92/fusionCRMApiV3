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
exports.handleWebhook = void 0;
const OrganizationModel_1 = __importDefault(require("../../../models/OrganizationModel"));
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const getMedia_1 = require("./getMedia");
const notificationController_1 = require("../../notifications/notificationController");
const aws_1 = require("../../../config/aws");
const pushNotificationService_1 = require("./pushNotificationService");
const IntegrationsModel_1 = __importDefault(require("../../../models/IntegrationsModel"));
const ConversationModel_1 = __importDefault(require("../../../models/ConversationModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../../models/ConversationPipelineModel"));
const socket_1 = require("../../../config/socket");
const createConversation_1 = require("../../../services/conversations/createConversation");
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        console.log("[WEBHOOK] Recibiendo nuevo webhook de WhatsApp");
        console.log("[WEBHOOK] Body:", JSON.stringify(req.body, null, 2));
        const { entry } = req.body;
        if (!entry || !Array.isArray(entry)) {
            console.log("[WEBHOOK] Webhook inválido: entry no es un array");
            return res.status(400).json({ error: "Invalid webhook format" });
        }
        for (const value of entry) {
            console.log("[WEBHOOK] Procesando entrada del webhook");
            const changes = value.changes;
            if (!changes || !Array.isArray(changes)) {
                console.log("[WEBHOOK] Webhook inválido: changes no es un array");
                continue;
            }
            for (const change of changes) {
                const value = change.value;
                if (!value.messages) {
                    continue;
                }
                const message = value.messages[0];
                if (!message) {
                    continue;
                }
                const { from, timestamp, type } = message;
                const to = (_a = value.metadata) === null || _a === void 0 ? void 0 : _a.display_phone_number;
                if (!to) {
                    console.error("No display_phone_number in metadata");
                    continue;
                }
                const integration = yield IntegrationsModel_1.default.findOne({
                    service: "whatsapp",
                    "credentials.phoneNumber": to,
                });
                const organization = integration === null || integration === void 0 ? void 0 : integration.organizationId;
                if (!organization) {
                    console.error(`Organization with WhatsApp number ${to} not found.`);
                    res.status(400).send("Organization not found");
                    return;
                }
                const accessToken = integration === null || integration === void 0 ? void 0 : integration.credentials.accessToken;
                const org = yield OrganizationModel_1.default.findOne({
                    _id: organization,
                });
                const systemUserId = org === null || org === void 0 ? void 0 : org.employees[0];
                if (!systemUserId) {
                    console.error("No system user found.");
                    res.status(500).send("System user not found");
                    return;
                }
                // Verificar si el mensaje ya existe
                const existingMessage = yield MessageModel_1.default.findOne({
                    messageId: message.id,
                    organization: organization._id,
                });
                if (existingMessage) {
                    console.log(`[WEBHOOK] Mensaje duplicado detectado:
            - MessageId: ${message.id}
            - Organization: ${organization._id}
            - Timestamp original: ${existingMessage.timestamp}
          `);
                    continue;
                }
                console.log(`[WEBHOOK] Creando nuevo mensaje:
          - From: ${from}
          - To: ${to}
          - Type: ${type}
          - MessageId: ${message.id}
        `);
                // Log del mensaje entrante
                const contactName = ((_d = (_c = (_b = value.contacts) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.profile) === null || _d === void 0 ? void 0 : _d.name) || "Sin nombre";
                console.log(`[INCOMING] Mensaje de ${contactName} (${from}): ${((_e = message.text) === null || _e === void 0 ? void 0 : _e.body) || type}`);
                let text = "";
                let awsUrl = null;
                if (type === "reaction") {
                    yield handleReaction(message, timestamp);
                    continue;
                }
                if (type === "text") {
                    text = message.text.body;
                }
                else if (["image", "document", "audio", "video", "sticker"].includes(type)) {
                    text = `${capitalizeFirstLetter(type)} recibido`;
                    const mediaObject = message[type];
                    if (mediaObject === null || mediaObject === void 0 ? void 0 : mediaObject.id) {
                        const mediaBuffer = yield (0, getMedia_1.getMedia)(mediaObject.id, accessToken);
                        awsUrl = yield (0, aws_1.subirArchivo)(mediaBuffer, mediaObject.id, mediaObject.mime_type);
                    }
                }
                else {
                    text = "Otro tipo de mensaje recibido";
                }
                const repliedMessageId = (_f = message.context) === null || _f === void 0 ? void 0 : _f.id;
                const originalMessage = repliedMessageId
                    ? yield MessageModel_1.default.findOne({ messageId: repliedMessageId })
                    : null;
                const pipeline = yield ConversationPipelineModel_1.default.findOne({
                    organization: organization,
                });
                if (!pipeline) {
                    console.error("No pipeline found");
                    res.status(500).send("Pipeline not found");
                    return;
                }
                let conversation = yield ConversationModel_1.default.findOne({
                    "participants.contact.reference": from,
                });
                /*
                Una conversacion se crea doble si un chat que avanzo de etapa se vuelve a abrir?
                No, no deben haber dos conversacion, tocaria buscarlas y actualizar la conversacion para reabrirla.
        
                Entonces:
                1. Si no hay conversacion, crear una nueva
                2. Si hay conversacion, actualizar la conversacion para reabrirla (como saber que currentStage es?)
                3. Si hay conversacion, agregar el mensaje a la conversacion
                */
                // Crear conversación si no existe
                if (!conversation) {
                    console.log(`[WEBHOOK] Creando nueva conversación:
            - Título: ${contactName}
            - SystemUserId: ${systemUserId}
            - Contact Reference: ${from}
          `);
                    conversation = yield ConversationModel_1.default.create({
                        title: contactName,
                        organization: organization,
                        participants: {
                            user: {
                                type: "User",
                                reference: systemUserId,
                            },
                            contact: {
                                type: "Contact",
                                reference: from,
                            },
                        },
                        pipeline: pipeline === null || pipeline === void 0 ? void 0 : pipeline._id,
                        currentStage: 0,
                        assignedTo: systemUserId,
                        priority: "low",
                        tags: [],
                        firstContactTimestamp: new Date(),
                        metadata: [],
                    });
                    console.log(`[WEBHOOK] Conversación creada:
            - ID: ${conversation._id}
            - Título: ${conversation.title}
            - AssignedTo: ${conversation.assignedTo}
          `);
                }
                else {
                    // Si la conversación existe, verificar si debe reabrirse
                    console.log(`[WEBHOOK] Conversación existente:
            - ID: ${conversation._id}
            - Título actual: ${conversation.title}
            - AssignedTo actual: ${conversation.assignedTo}
          `);
                    const wasReopened = yield (0, createConversation_1.reopenConversationIfClosed)(conversation);
                    if (wasReopened) {
                        console.log(`[WEBHOOK] Conversación ${conversation._id} fue reabierta automáticamente`);
                    }
                }
                // Crear mensaje
                const newMessage = yield MessageModel_1.default.create({
                    user: systemUserId,
                    organization: organization._id,
                    from,
                    to,
                    message: text,
                    mediaUrl: awsUrl,
                    mediaId: ((_g = message[type]) === null || _g === void 0 ? void 0 : _g.id) || "",
                    timestamp: new Date(parseInt(timestamp) * 1000),
                    type,
                    direction: "incoming",
                    possibleName: ((_k = (_j = (_h = value.contacts) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.profile) === null || _k === void 0 ? void 0 : _k.name) || "",
                    replyToMessage: (originalMessage === null || originalMessage === void 0 ? void 0 : originalMessage._id) || null,
                    messageId: message.id,
                    conversation: conversation._id,
                });
                console.log(`[WEBHOOK] Mensaje creado exitosamente con ID: ${newMessage._id}`);
                // Actualizar la conversación con el último mensaje
                console.log("[WEBHOOK] Actualizando conversación");
                conversation.lastMessage = newMessage._id;
                conversation.lastMessageTimestamp = newMessage.timestamp;
                conversation.unreadCount = (conversation.unreadCount || 0) + 1;
                yield conversation.save();
                console.log("[WEBHOOK] Emitiendo eventos de socket");
                // Emitir evento de nuevo mensaje a través de socket
                const io = (0, socket_1.getSocketInstance)();
                // Emitir a la sala de la conversación
                io.to(`conversation_${conversation._id}`).emit("newMessage", Object.assign(Object.assign({}, newMessage.toObject()), { direction: "incoming" }));
                // Emitir a la sala de la organización
                io.to(`organization_${organization._id}`).emit("whatsapp_message", {
                    message: newMessage.toObject(),
                    contact: from,
                    conversationId: conversation._id,
                });
                console.log(`[SOCKET] Mensaje enviado a conversación ${conversation._id} y organización ${organization._id}`);
                // Enviar notificación push (si hay tokens configurados)
                const toTokens = ["ExponentPushToken[I5cjWVDWDbnjGPUqFdP2dL]"];
                try {
                    yield (0, pushNotificationService_1.sendNotification)(toTokens, {
                        title: contactName,
                        body: text,
                    });
                }
                catch (error) {
                    console.error("[PUSH] Error enviando notificación:", error);
                }
                (0, notificationController_1.emitNewNotification)("whatsapp", organization._id, 1, from, {
                    message: text,
                    timestamp: new Date(parseInt(timestamp) * 1000),
                });
                // Procesar automatizaciones
                try {
                    const { AutomationExecutor } = yield Promise.resolve().then(() => __importStar(require("../../../services/automations/automationExecutor")));
                    // Determinar si es el primer mensaje de la conversación
                    const messageCount = yield MessageModel_1.default.countDocuments({
                        conversation: conversation._id,
                        direction: "incoming",
                    });
                    const isFirstMessage = messageCount === 1;
                    // Procesar el mensaje con el sistema de automatizaciones
                    yield AutomationExecutor.processIncomingMessage(conversation._id.toString(), organization._id.toString(), from, text, isFirstMessage);
                    console.log(`[AUTOMATION] Procesado mensaje para conversación ${conversation._id}`);
                }
                catch (error) {
                    console.error(`[AUTOMATION] Error:`, error);
                }
            }
        }
        res.status(200).send("Mensaje recibido");
    }
    catch (error) {
        console.error("[WEBHOOK] Error procesando webhook:", error);
        res.status(500).json({ error: "Error handling webhook" });
    }
});
exports.handleWebhook = handleWebhook;
const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};
const handleReaction = (message, timestamp) => __awaiter(void 0, void 0, void 0, function* () {
    const { reaction } = message;
    const emoji = reaction.emoji;
    const messageIdReactedTo = reaction.message_id;
    const originalMessage = yield MessageModel_1.default.findOne({
        messageId: messageIdReactedTo,
    });
    if (!originalMessage) {
        console.error(`Mensaje original con ID ${messageIdReactedTo} no encontrado.`);
        return;
    }
    const reactionData = {
        reaction: emoji,
        user: message.from,
        timestamp: new Date(parseInt(timestamp) * 1000),
    };
    originalMessage.reactions = originalMessage.reactions || [];
    originalMessage.reactions.push(reactionData);
    yield originalMessage.save();
});
