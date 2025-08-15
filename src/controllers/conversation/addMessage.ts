import { Request, Response } from "express";
import Conversation from "../../models/ConversationModel";
import Message from "../../models/MessageModel";
import { Types } from "mongoose";
import { reopenConversationIfClosed } from "../../services/conversations/createConversation";

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
    } = req.body;

    // Validación y trazas mínimas

    const organizationId = req.organization;
    const userId = req.user?._id;

    // Validaciones básicas
    if (!from || !to || !message || !type || !direction) {
      return res.status(400).json({
        success: false,
        message: "Se requieren los campos from, to, message, type y direction",
      });
    }

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

    // Si es un mensaje entrante, verificar si la conversación debe reabrirse
    if (direction === "incoming") {
      await reopenConversationIfClosed(conversation);
    }

    // Verificar si ya existe un mensaje con el mismo messageId
    if (messageId) {
      const existingMessage = await Message.findOne({
        messageId,
        organization: organizationId,
      });

      if (existingMessage) {
        return res.status(409).json({
          success: false,
          message: "Mensaje duplicado",
        });
      }
    }

    // Crear el nuevo mensaje
    // Creando nuevo mensaje en la base de datos
    const newMessage = new Message({
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

    await newMessage.save();

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
    console.error("Error al agregar mensaje:", error);
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
