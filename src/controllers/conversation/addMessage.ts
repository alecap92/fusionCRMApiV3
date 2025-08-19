import { Request, Response } from "express";
import axios from "axios";
import Conversation from "../../models/ConversationModel";
import Message from "../../models/MessageModel";
import IntegrationsModel from "../../models/IntegrationsModel";
import { Types } from "mongoose";
import { reopenConversationIfClosed } from "../../services/conversations/createConversation";
import logger from "../../utils/logger";

/**
 * Agrega un nuevo mensaje a una conversación
 */
export const addMessage = async (
  req: Request & { organization?: any; user?: any },
  res: Response
) => {
  try {
    const { conversationId } = req.params;
    const {
      from,
      to,
      message,
      mediaUrl,
      mediaId,
      type,
      direction,
      latitude,
      longitude,
      replyToMessage,
      messageId,
      filename,
      mimeType,
    } = req.body;

    // Validación y trazas mínimas
    logger.info("[ADD_MESSAGE] Inicio solicitud", {
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

    const organizationId = (req as any)?.user?.organizationId || (req as any)?.organization;
    const userId = req.user?._id;
    logger.info("[ADD_MESSAGE] Contexto de seguridad", {
      organizationId,
      userId,
    });

    // Validaciones básicas
    if (!to || !type || !direction) {
      logger.warn("[ADD_MESSAGE] Faltan campos requeridos", {
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
      logger.warn("[ADD_MESSAGE] Faltan contenido de mensaje o mediaUrl");
      return res.status(400).json({
        success: false,
        message: "Se requiere 'message' o 'mediaUrl'",
      });
    }

    // Verificar que la conversación existe
    const conversation = await Conversation.findOne({
      _id: conversationId,
      organization: organizationId,
    });

    logger.info("[ADD_MESSAGE] Verificación de conversación", {
      conversationId,
      organizationId,
      found: Boolean(conversation),
    });

    if (!conversation) {
      logger.warn("[ADD_MESSAGE] Conversación no encontrada", {
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
      logger.info("[ADD_MESSAGE] Mensaje entrante: reabrir conversación si aplica", {
        conversationId,
      });
      await reopenConversationIfClosed(conversation);
    }

    // Verificar si ya existe un mensaje con el mismo messageId
    if (messageId) {
      const existingMessage = await Message.findOne({
        messageId,
        organization: organizationId,
      });

      if (existingMessage) {
        logger.warn("[ADD_MESSAGE] Mensaje duplicado detectado", {
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
    let outgoingMessageId: string | undefined;
    let senderPhoneNumber: string | undefined;
    if (direction === "outgoing") {
      // Buscar integración de WhatsApp
      logger.info("[ADD_MESSAGE] Mensaje saliente: consultando integración de WhatsApp", {
        organizationId,
      });
      const integration = await IntegrationsModel.findOne({
        organizationId: organizationId,
        service: "whatsapp",
      });

      if (!integration) {
        logger.warn("[ADD_MESSAGE] Integración de WhatsApp no encontrada", {
          organizationId,
        });
        return res.status(400).json({
          success: false,
          message: "Integración de WhatsApp no encontrada",
        });
      }

      const apiUrl = process.env.WHATSAPP_API_URL as string;
      const phoneNumberId = integration.credentials?.numberIdIdentifier as string;
      const accessToken = integration.credentials?.accessToken as string;
      senderPhoneNumber = (integration.credentials as any)?.phoneNumber || undefined;

      if (!apiUrl || !phoneNumberId || !accessToken) {
        logger.warn("[ADD_MESSAGE] Credenciales de WhatsApp incompletas", {
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
      logger.info("[ADD_MESSAGE] Enviando a WhatsApp API", {
        whatsappApiUrl,
        type,
        to,
        hasMediaUrl: Boolean(mediaUrl),
      });

      // Construir payload según el tipo
      let payload: any;
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
              image: {
                link: mediaUrl,
                ...(message ? { caption: message } : {}),
              },
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
              document: {
                link: mediaUrl,
                ...(message ? { caption: message } : {}),
                ...(filename ? { filename } : {}),
              },
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
              video: {
                link: mediaUrl,
                ...(message ? { caption: message } : {}),
              },
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

        const response = await axios.post(whatsappApiUrl, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        logger.info("[ADD_MESSAGE] WhatsApp API respuesta", {
          status: response.status,
          messageId: response.data?.messages?.[0]?.id || null,
        });
        outgoingMessageId = response.data?.messages?.[0]?.id;
      } catch (sendError: any) {
        const status = sendError?.response?.status || 500;
        const details = sendError?.response?.data || { message: sendError?.message };
        logger.error("[ADD_MESSAGE] Error al enviar mensaje a WhatsApp", {
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
    const effectiveFrom = from || senderPhoneNumber || (direction === "outgoing" ? "system" : to);
    logger.info("[ADD_MESSAGE] Determinación del remitente (from)", {
      providedFrom: from || null,
      senderPhoneNumber: senderPhoneNumber || null,
      effectiveFrom,
    });
    const newMessage = new Message({
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

    await newMessage.save();
    logger.info("[ADD_MESSAGE] Mensaje guardado", {
      messageDbId: (newMessage as any)?._id,
      conversationId,
      direction,
      type,
    });

    // Actualizar la conversación con la referencia al último mensaje
    // Actualizando conversación con el nuevo mensaje
    conversation.lastMessage = newMessage._id as any;
    conversation.lastMessageTimestamp = newMessage.timestamp;

    // Si es un mensaje entrante, incrementar el contador de no leídos
    if (direction === "incoming") {
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    } else if (direction === "outgoing") {
      // Si es un mensaje saliente, resetear el contador de no leídos
      conversation.unreadCount = 0;
    }

    // Si falta displayInfo del contacto, intentar enriquecerlo mínimamente (solo mobile)
    try {
      const ref = conversation?.participants?.contact?.reference;
      if (ref && !conversation?.participants?.contact?.displayInfo?.mobile) {
        (conversation as any).participants.contact.displayInfo = {
          ...(conversation as any).participants.contact.displayInfo,
          mobile: ref,
        };
      }
    } catch (e) {
      console.warn("[ADD_MESSAGE] No se pudo enriquecer displayInfo:", e);
    }

    await conversation.save();
    logger.info("[ADD_MESSAGE] Conversación actualizada", {
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
  } catch (error: any) {
    logger.error("[ADD_MESSAGE] Error no controlado", {
      error: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({
      success: false,
      message: "Error al agregar mensaje",
      error: error.message,
    });
  }
};

/**
 * Marca todos los mensajes de una conversación como leídos
 */
export const markConversationAsRead = async (
  req: Request & { organization?: any; user?: any },
  res: Response
) => {
  try {
    const { conversationId } = req.params;
    // Algunos middlewares adjuntan la organización como req.user.organizationId.
    // Aseguramos compatibilidad tomando primero la de usuario y luego el fallback.
    const organizationId = (req as any)?.user?.organizationId || (req as any)?.organization;

    // Verificar que la conversación existe
    const conversation = await Conversation.findOne({
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
    await Message.updateMany(
      {
        conversation: conversationId,
        direction: "incoming",
        isRead: false,
      },
      { isRead: true }
    );

    // Resetear el contador de no leídos de la conversación
    conversation.unreadCount = 0;
    await conversation.save();

    return res.status(200).json({
      success: true,
      message: "Conversación marcada como leída",
    });
  } catch (error: any) {
    console.error("Error al marcar conversación como leída:", error);
    return res.status(500).json({
      success: false,
      message: "Error al marcar conversación como leída",
      error: error.message,
    });
  }
};

/**
 * Obtiene los mensajes no leídos pendientes para un usuario
 */
export const getUnreadMessagesCount = async (
  req: Request & { organization?: any; user?: any },
  res: Response
) => {
  try {
    const organizationId = req.organization;
    const userId = req.user?._id;

    // Contar conversaciones con mensajes no leídos asignadas al usuario
    const unreadConversations = await Conversation.countDocuments({
      organization: organizationId,
      assignedTo: userId,
      unreadCount: { $gt: 0 },
    });

    // Contar total de mensajes no leídos asignados al usuario
    const totalUnreadMessages = await Conversation.aggregate([
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

    const totalCount =
      totalUnreadMessages.length > 0 ? totalUnreadMessages[0].total : 0;

    return res.status(200).json({
      success: true,
      data: {
        unreadConversations,
        totalUnreadMessages: totalCount,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener conteo de mensajes no leídos:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener conteo de mensajes no leídos",
      error: error.message,
    });
  }
};
