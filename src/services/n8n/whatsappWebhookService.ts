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

import axios from "axios";
import IntegrationsModel from "../../models/IntegrationsModel";
import MessageModel from "../../models/MessageModel";
import { Types } from "mongoose";

interface IWhatsAppWebhookParams {
  message: string;
  conversationId: string;
  from: string;
  to: string;
  organizationId: string;
  timestamp: Date;
  lastMessageTimestamp: Date;
  whatsappData: any; // Objeto completo de WhatsApp
}

interface IPayloadWhatsAppWebhook {
  message: string;
  conversationId: string;
  contacto: string;
  from: string;
  to: string;
  hasPreviousMessages: boolean;
  previousMessages?: any[];
  timestamp: string;
  lastMessageTimestamp: string;
  whatsappData: any; // Objeto completo de WhatsApp
}

const sendWhatsAppWebhook = async (params: IWhatsAppWebhookParams) => {
  const {
    message,
    conversationId,
    from,
    to,
    organizationId,
    timestamp,
    lastMessageTimestamp,
    whatsappData,
  } = params;

  // Obtener mensajes previos de la conversación
  const previousMessages = await MessageModel.find({
    conversation: new Types.ObjectId(conversationId),
    direction: "incoming",
  })
    .sort({ timestamp: -1 })
    .limit(5) // Últimos 5 mensajes
    .lean();

  const hasPreviousMessages = previousMessages.length > 1;

  const payload: IPayloadWhatsAppWebhook = {
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

  const integration = await IntegrationsModel.findOne({
    organizationId: new Types.ObjectId(organizationId),
    service: "N8N",
  });

  if (!integration) {
    console.log("No N8N integration found for organization:", organizationId);
    return;
  }

  try {
    await axios.post(integration.credentials.webhook, payload);
    console.log("WhatsApp webhook sent successfully to N8N");
  } catch (error) {
    console.error("Error sending webhook to N8N:", error);
  }

  return;
};

export default sendWhatsAppWebhook;
