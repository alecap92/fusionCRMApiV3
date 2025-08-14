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
import UserModel from "../../../models/UserModel";
import { reopenConversationIfClosed } from "../../../services/conversations/createConversation";

export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const { entry } = req.body;

    if (!entry || !Array.isArray(entry)) {
      return res.status(400).json({ error: "Invalid webhook format" });
    }

    for (const value of entry) {
      const changes = value.changes;

      if (!changes || !Array.isArray(changes)) {
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

        // Verificar si el mensaje ya existe
        const existingMessage = await MessageModel.findOne({
          messageId: message.id,
          organization: organization._id,
        });

        if (existingMessage) {
          continue;
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
          const mediaObject = message[type];

          // Preferir caption cuando exista
          const fallbackByType: Record<string, string> = {
            image: "Imagen recibida",
            document: "Documento recibido",
            audio: "Audio recibido",
            video: "Video recibido",
            sticker: "Sticker recibido",
          };
          text =
            mediaObject?.caption || fallbackByType[type] || "Archivo recibido";

          if (mediaObject?.id) {
            const mediaBuffer = await getMedia(mediaObject.id, accessToken);

            // Determinar un nombre de archivo adecuado conservando la extensión
            const inferExtensionFromMime = (mime?: string): string => {
              if (!mime) return "";
              const map: Record<string, string> = {
                "application/pdf": "pdf",
                "application/postscript": "ps",
                "application/msword": "doc",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
                "application/vnd.ms-excel": "xls",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
                "text/plain": "txt",
                "text/csv": "csv",
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/gif": "gif",
                "video/mp4": "mp4",
                "audio/mpeg": "mp3",
                "audio/ogg": "ogg",
                "application/zip": "zip",
              };
              return map[mime] || (mime.split("/")[1] || "");
            };

            const ensureExtension = (name: string, mime?: string): string => {
              const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(name);
              if (hasExt) return name;
              const ext = inferExtensionFromMime(mime);
              return ext ? `${name}.${ext}` : name;
            };

            const baseFilename: string = mediaObject.filename || mediaObject.id;
            const finalFilename = ensureExtension(baseFilename, mediaObject.mime_type);

            awsUrl = await subirArchivo(
              mediaBuffer,
              finalFilename,
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

        // Crear conversación si no existe
        if (!conversation) {
          const contactName = value.contacts?.[0]?.profile?.name || "Sin nombre";
          
          conversation = await ConversationModel.create({
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
          await reopenConversationIfClosed(conversation);
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
          filename: (message[type] as any)?.filename || undefined,
          mimeType: (message[type] as any)?.mime_type || undefined,
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

        // Emitir a la sala de la organización
        io.to(`organization_${organization._id}`).emit("whatsapp_message", {
          message: newMessage.toObject(),
          contact: from,
          conversationId: conversation._id,
        });

        // Obtener tokens de push del usuario asignado
        try {
          const assignedUserId = conversation.assignedTo;
          const usersToNotify = await UserModel.find(
            { _id: assignedUserId },
            { pushToken: 1 }
          );

          const toTokens = usersToNotify
            .flatMap((u) => u.pushToken || [])
            .filter(Boolean)
            .filter((t) => Expo.isExpoPushToken(t));

          // Solo enviar si hay tokens válidos
          if (toTokens.length > 0) {
            const contactName = value.contacts?.[0]?.profile?.name || "Sin nombre";
            await sendNotification(toTokens, {
              title: contactName,
              body: text,
              data: {
                conversationId: String(conversation._id),
                type: "whatsapp_message",
              },
            } as any);
          }
        } catch (error) {
          console.error("[PUSH] Error enviando notificación:", error);
        }

        emitNewNotification("whatsapp", organization._id, 1, from, {
          message: text,
          timestamp: new Date(parseInt(timestamp) * 1000),
        });

        // Procesar automatizaciones
        try {
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
          console.error(`[AUTOMATION] Error:`, error);
        }
      }
    }

    res.status(200).send("Mensaje recibido");
  } catch (error) {
    console.error("[WEBHOOK] Error procesando webhook:", error);
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
