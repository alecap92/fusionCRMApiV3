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
exports.sendTemplateMessage = void 0;
const OrganizationModel_1 = __importDefault(require("../../../models/OrganizationModel"));
const axios_1 = __importStar(require("axios"));
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const IntegrationsModel_1 = __importDefault(require("../../../models/IntegrationsModel"));
const ConversationModel_1 = __importDefault(require("../../../models/ConversationModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../../models/ConversationPipelineModel"));
const sendTemplateMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Usuario no autenticado" });
        }
        const organizationId = req.user.organizationId;
        if (!organizationId) {
            return res
                .status(400)
                .json({ error: "ID de organización no encontrado" });
        }
        const organization = yield OrganizationModel_1.default.findOne({
            _id: organizationId,
        });
        if (!organization) {
            return res.status(400).json({ error: "Organización no encontrada" });
        }
        const integration = yield IntegrationsModel_1.default.findOne({
            organizationId: organizationId,
            service: "whatsapp",
        });
        if (!integration) {
            return res
                .status(400)
                .json({ error: "Integración de WhatsApp no encontrada" });
        }
        if (!((_a = integration.credentials) === null || _a === void 0 ? void 0 : _a.numberIdIdentifier) ||
            !((_b = integration.credentials) === null || _b === void 0 ? void 0 : _b.accessToken)) {
            return res
                .status(400)
                .json({ error: "Credenciales de WhatsApp incompletas" });
        }
        const { template, phoneNumber } = req.body;
        if (!template) {
            return res.status(400).json({ error: "Plantilla no encontrada" });
        }
        if (!phoneNumber) {
            return res
                .status(400)
                .json({ error: "Número de teléfono no encontrado" });
        }
        const whatsappApiUrl = `${process.env.WHATSAPP_API_URL}/${integration.credentials.numberIdIdentifier}/messages`;
        // Verificar si es una plantilla de WhatsApp oficial o una plantilla de texto simple
        let payload;
        let messageText = "";
        if (template.name && template.language && template.components) {
            // Es una plantilla oficial de WhatsApp
            payload = {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "template",
                template: {
                    name: template.name,
                    language: {
                        code: template.language,
                    },
                },
            };
            // Extraer el texto del mensaje para guardarlo en la base de datos
            messageText =
                ((_d = (_c = template.components) === null || _c === void 0 ? void 0 : _c.find((comp) => comp.type === "BODY")) === null || _d === void 0 ? void 0 : _d.text) ||
                    ((_f = (_e = template.components) === null || _e === void 0 ? void 0 : _e.find((comp) => comp.type === "HEADER")) === null || _f === void 0 ? void 0 : _f.text) ||
                    template.message ||
                    "Template message";
        }
        else {
            // Es una plantilla de texto simple, enviar como mensaje de texto normal
            payload = {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "text",
                text: {
                    body: template.message || template.text || "Mensaje de plantilla",
                },
            };
            messageText = template.message || template.text || "Mensaje de plantilla";
        }
        let response;
        try {
            response = yield axios_1.default.post(whatsappApiUrl, payload, {
                headers: {
                    Authorization: `Bearer ${integration.credentials.accessToken}`,
                },
            });
        }
        catch (error) {
            if (error instanceof axios_1.AxiosError) {
                console.error("Error de WhatsApp API:", (_g = error.response) === null || _g === void 0 ? void 0 : _g.data);
                return res.status(((_h = error.response) === null || _h === void 0 ? void 0 : _h.status) || 500).json({
                    error: "Error al enviar mensaje a WhatsApp",
                    details: (_j = error.response) === null || _j === void 0 ? void 0 : _j.data,
                });
            }
            throw error;
        }
        const conversation = yield ConversationModel_1.default.findOne({
            organization: organizationId,
            "participants.contact.reference": phoneNumber,
        });
        let conversationId;
        if (!conversation) {
            try {
                // Obtener el pipeline predeterminado dinámicamente
                const defaultPipeline = yield ConversationPipelineModel_1.default.findOne({
                    organization: organizationId,
                    isDefault: true,
                });
                if (!defaultPipeline) {
                    return res.status(400).json({
                        error: "No se encontró un pipeline predeterminado para la organización",
                    });
                }
                const newConversation = new ConversationModel_1.default({
                    organization: organizationId,
                    title: phoneNumber,
                    participants: {
                        user: {
                            type: "User",
                            reference: req.user._id,
                        },
                        contact: {
                            type: "Contact",
                            reference: phoneNumber,
                        },
                    },
                    unreadCount: 0,
                    isResolved: false,
                    priority: "low",
                    tags: [],
                    firstContactTimestamp: new Date(),
                    metadata: [
                        {
                            key: "origen",
                            value: "whatsapp",
                        },
                    ],
                    isArchived: false,
                    pipeline: defaultPipeline._id,
                    assignedTo: req.user._id,
                });
                yield newConversation.save();
                conversationId = newConversation._id;
            }
            catch (error) {
                console.error("Error al crear la conversación:", error);
                return res
                    .status(500)
                    .json({ error: "Error al crear la conversación" });
            }
        }
        else {
            conversationId = conversation._id;
        }
        console.log(template, "template");
        try {
            const outGoingMessage = yield MessageModel_1.default.create({
                organization: organizationId,
                from: integration.credentials.phoneNumber,
                to: phoneNumber,
                type: "text",
                direction: "outgoing",
                message: messageText,
                isRead: true,
                user: req.user._id,
                conversation: conversationId,
                messageId: (_m = (_l = (_k = response.data) === null || _k === void 0 ? void 0 : _k.messages) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.id,
            });
            yield outGoingMessage.save();
            // Resetear contador de no leídos cuando se envía un mensaje saliente
            yield ConversationModel_1.default.findByIdAndUpdate(conversationId, {
                unreadCount: 0,
            });
            return res.status(200).json({
                message: "Mensaje de plantilla enviado exitosamente",
                conversationId,
                messageId: outGoingMessage._id,
            });
        }
        catch (error) {
            console.error("Error al guardar el mensaje:", error);
            return res.status(500).json({ error: "Error al guardar el mensaje" });
        }
    }
    catch (error) {
        console.error("Error en sendTemplateMessage:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
            message: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
});
exports.sendTemplateMessage = sendTemplateMessage;
