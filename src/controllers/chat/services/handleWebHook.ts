import { Request, Response } from "express";
import OrganizationModel from "../../../models/OrganizationModel";
import MessageModel from "../../../models/MessageModel";
import { getMedia } from "./getMedia";
import { emitNewNotification } from "../../notifications/notificationController";
import { subirArchivo } from "../../../config/aws";
import { Expo } from "expo-server-sdk";
import { sendNotification } from "./pushNotificationService";
import IntegrationsModel from "../../../models/IntegrationsModel";
import ConversationModel from "../../../models/ConversationModel";
import ConversationPipelineModel from "../../../models/ConversationPipelineModel";
import { getSocketInstance } from "../../../config/socket";
import axios from "axios";
import UserModel from "../../../models/UserModel";
import { reopenConversationIfClosed } from "../../../services/conversations/createConversation";
import { AutomationHelper } from "../../../utils/automationHelper";
import { sendCustomMessage } from "./sendCustomMessage";

export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      res.status(400).json({ error: "Invalid webhook payload" });
      return;
    }

    // Validar la estructura del webhook
    if (!body.entry?.[0]?.changes?.[0]?.value) {
      console.error("Invalid webhook structure:", body);
      res.status(400).json({ error: "Invalid webhook structure" });
      return;
    }

    const value = body.entry[0].changes[0].value;

    // Verificar si es un webhook de status (confirmación de envío)
    if (value.statuses) {
      // Log más silencioso para webhooks de estado
      if (value.statuses[0].errors) {
        console.log("Status webhook error:", value.statuses[0].errors);
      }
      // Solo loguear estados que no sean 'sent' o 'delivered' para reducir ruido
      const status = value.statuses[0]?.status;
      if (status && !["sent", "delivered"].includes(status)) {
        console.log("Status webhook:", status);
      }

      res.status(200).send({
        message: "Status webhook received",
        status: value.statuses[0]?.status,
        errors: value.statuses[0].errors,
      });
      return;
    }

    // Si no es un webhook de status, continuar con el procesamiento de mensajes
    const profileName = value.contacts?.[0]?.profile?.name
      ? `${value.contacts[0].profile.name} (${value.contacts[0].wa_id})`
      : "Unknown Contact";

    console.log("Processing message from:", profileName);

    for (const entry of body.entry || []) {
      const { changes } = entry;

      for (const change of changes || []) {
        const value = change.value;

        if (!value.messages) {
          continue; // Silenciosamente ignoramos webhooks sin mensajes
        }

        const message = value.messages[0];
        if (!message) {
          continue;
        }

        const { from, timestamp, type } = message;
        const to = value.metadata?.display_phone_number;

        if (!to) {
          console.error("No display_phone_number in metadata");
          continue;
        }

        const integration = await IntegrationsModel.findOne({
          service: "whatsapp",
          "credentials.phoneNumber": to,
        });

        const organization = integration?.organizationId;

        if (!organization) {
          console.error(`Organization with WhatsApp number ${to} not found.`);
          res.status(400).send("Organization not found");
          return;
        }

        const accessToken = integration?.credentials.accessToken as string;

        const org = await OrganizationModel.findOne({
          _id: organization,
        });

        const systemUserId = org?.employees[0];

        if (!systemUserId) {
          console.error("No system user found.");
          res.status(500).send("System user not found");
          return;
        }

        let text = "";
        let awsUrl: string | null = null;

        if (type === "reaction") {
          await handleReaction(message, timestamp);
          continue;
        }

        if (type === "text") {
          text = message.text.body;
        } else if (
          ["image", "document", "audio", "video", "sticker"].includes(type)
        ) {
          text = `${capitalizeFirstLetter(type)} recibido`;

          const mediaObject = message[type];

          if (mediaObject?.id) {
            const mediaBuffer = await getMedia(mediaObject.id, accessToken);
            awsUrl = await subirArchivo(
              mediaBuffer,
              mediaObject.id,
              mediaObject.mime_type
            );
          }
        } else {
          text = "Otro tipo de mensaje recibido";
        }

        const repliedMessageId = message.context?.id;
        const originalMessage = repliedMessageId
          ? await MessageModel.findOne({ messageId: repliedMessageId })
          : null;

        const pipeline = await ConversationPipelineModel.findOne({
          organization: organization,
        });

        if (!pipeline) {
          console.error("No pipeline found");
          res.status(500).send("Pipeline not found");
          return;
        }

        let conversation = await ConversationModel.findOne({
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
          conversation = await ConversationModel.create({
            title: profileName,
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
            pipeline: pipeline?._id,
            currentStage: 0,
            assignedTo: systemUserId,
            priority: "low",
            tags: [],
            firstContactTimestamp: new Date(),
            metadata: [],
          });
        } else {
          // Si la conversación existe, verificar si debe reabrirse
          const wasReopened = await reopenConversationIfClosed(conversation);
          if (wasReopened) {
            console.log(
              `Conversación ${conversation._id} fue reabierta automáticamente`
            );
          }
        }

        // Crear mensaje
        const newMessage = await MessageModel.create({
          user: systemUserId,
          organization: organization._id,
          from,
          to,
          message: text,
          mediaUrl: awsUrl,
          mediaId: message[type]?.id || "",
          timestamp: new Date(parseInt(timestamp) * 1000),
          type,
          direction: "incoming",
          possibleName: value.contacts?.[0]?.profile?.name || "",
          replyToMessage: originalMessage?._id || null,
          messageId: message.id,
          conversation: conversation._id,
        });

        // Actualizar la conversación con el último mensaje
        conversation.lastMessage = newMessage._id as any;
        conversation.lastMessageTimestamp = newMessage.timestamp;
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        await conversation.save();

        // Emitir evento de nuevo mensaje a través de socket
        const io = getSocketInstance();

        // Emitir a la sala de la conversación
        io.to(`conversation_${conversation._id}`).emit("newMessage", {
          ...newMessage.toObject(),
          direction: "incoming",
        });
        console.log(
          `[Socket] Mensaje emitido a la sala de conversación: conversation_${conversation._id}`
        );
        console.log(`[Socket] Detalles del mensaje:`, {
          messageId: newMessage._id,
          from: from,
          to: to,
          type: type,
          timestamp: new Date(parseInt(timestamp) * 1000),
        });

        // Emitir a la sala de la organización
        io.to(`organization_${organization._id}`).emit("whatsapp_message", {
          message: newMessage.toObject(),
          contact: from,
          conversationId: conversation._id,
        });
        console.log(
          `[Socket] Notificación emitida a la organización: organization_${organization._id}`
        );
        console.log(`[Socket] Detalles de la notificación:`, {
          contact: from,
          conversationId: conversation._id,
          organizationId: organization._id,
        });

        const toTokens = ["ExponentPushToken[I5cjWVDWDbnjGPUqFdP2dL]"];
        try {
          await sendNotification(toTokens, {
            title: value.contacts?.[0]?.profile?.name || "",
            body: text,
          });
        } catch (error) {
          console.log(error, "Error sending push notification");
        }

        emitNewNotification("whatsapp", organization._id, 1, from, {
          message: text,
          timestamp: new Date(parseInt(timestamp) * 1000),
        });

        // 🤖 NUEVA LÓGICA DE AUTOMATIZACIONES
        try {
          console.log(
            `[Automatizaciones] Procesando mensaje para conversación ${conversation._id}`
          );

          // Importar el ejecutor de automatizaciones
          const { AutomationExecutor } = await import(
            "../../../services/automations/automationExecutor"
          );

          // Determinar si es el primer mensaje de la conversación
          const messageCount = await MessageModel.countDocuments({
            conversation: conversation._id,
            direction: "incoming",
          });
          const isFirstMessage = messageCount === 1;

          // Procesar el mensaje con el sistema de automatizaciones
          await AutomationExecutor.processIncomingMessage(
            (conversation._id as any).toString(),
            organization._id.toString(),
            from,
            text,
            isFirstMessage
          );
        } catch (error) {
          console.error(
            `[Automatizaciones] Error procesando automatizaciones:`,
            error
          );
          // No fallar el webhook por errores de automatización
        }
      }
    }

    res.status(200).send("Mensaje recibido");
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Error handling webhook" });
  }
};

const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const handleReaction = async (
  message: any,
  timestamp: string
): Promise<void> => {
  const { reaction } = message;
  const emoji = reaction.emoji;
  const messageIdReactedTo = reaction.message_id;

  const originalMessage = await MessageModel.findOne({
    messageId: messageIdReactedTo,
  });

  if (!originalMessage) {
    console.error(
      `Mensaje original con ID ${messageIdReactedTo} no encontrado.`
    );
    return;
  }

  const reactionData = {
    reaction: emoji,
    user: message.from,
    timestamp: new Date(parseInt(timestamp) * 1000),
  };

  originalMessage.reactions = originalMessage.reactions || [];
  originalMessage.reactions.push(reactionData);
  await originalMessage.save();
};
