"use strict";
/*
            Objetivo: Enviar mensaje a N8N para ser procesado por el sistema de automatizaciones y que se pueda evaluar casos. Por ejemplo:
            1. Si la conversacion es nueva, entonces podria saludar.
            2. Si el mensaje lleva tiempo sin respuesta, entonces podria enviar un mensaje de respuesta.
            3. Podria escribir fuera del horario de atencion, entonces podria enviar un mensaje de respuesta.
        
            Consideraciones:
            1. Los webhooks de n8n deben almacenarse para cada organizationId, obtenerse desde el modelo integrations.

            
            Body:
            {
                message: string;
                contacto: string; -> Extraer del whatsapp incluyendo el numero de telefono
                hasPreviousMessages: boolean;
                previousMessages?: string[]; -> Extraer de Conversations / Messages models.
                timestamp: string;
                lastMessageTimestamp: string;
            }

            COde:

              // Obtener las integraciones de N8N
            const integrations = await IntegrationsModel.find({
              organizationId: organization._id,
              service: "N8N",
            });

           // revisar cual utilizar, podria hacer un switch?
           const integration = integrations[0];

           // Enviar mensaje a N8N
           await sendMessageToN8N(integration, {
            message: text,
            conversationId: conversation._id,

           });
          */
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
const axios_1 = __importDefault(require("axios"));
const IntegrationsModel_1 = __importDefault(require("../../models/IntegrationsModel"));
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const mongoose_1 = require("mongoose");
const sendWhatsAppWebhook = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { message, conversationId, from, to, organizationId, timestamp, lastMessageTimestamp, whatsappData, } = params;
    // Obtener mensajes previos de la conversación
    const previousMessages = yield MessageModel_1.default.find({
        conversation: new mongoose_1.Types.ObjectId(conversationId),
        direction: "incoming",
    })
        .sort({ timestamp: -1 })
        .limit(5) // Últimos 5 mensajes
        .lean();
    const hasPreviousMessages = previousMessages.length > 1;
    const payload = {
        message,
        conversationId,
        contacto: from,
        from,
        to,
        hasPreviousMessages,
        previousMessages: previousMessages,
        timestamp: timestamp.toISOString(),
        lastMessageTimestamp: lastMessageTimestamp.toISOString(),
        whatsappData,
    };
    const integration = yield IntegrationsModel_1.default.findOne({
        organizationId: new mongoose_1.Types.ObjectId(organizationId),
        service: "N8N",
    });
    if (!integration) {
        console.log("No N8N integration found for organization:", organizationId);
        return;
    }
    try {
        yield axios_1.default.post(integration.credentials.webhook, payload);
        console.log("WhatsApp webhook sent successfully to N8N");
    }
    catch (error) {
        console.error("Error sending webhook to N8N:", error);
    }
    return;
});
exports.default = sendWhatsAppWebhook;
