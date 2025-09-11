import Message from "../models/MessageModel";

export interface ConversationMessagesResponse {
  success: boolean;
  data: {
    conversationId: string;
    messages: any[];
    totalMessages: number;
    conversationInfo: {
      title: string;
      participants: any;
      createdAt: string;
      updatedAt: string;
    };
  };
  error?: string;
}

/**
 * Obtiene TODOS los mensajes de una conversación, manejando la paginación automáticamente
 * @param conversationId - ID de la conversación
 * @param organizationId - ID de la organización (para seguridad)
 * @returns Promise con todos los mensajes de la conversación
 */
export const getAllConversationMessages = async (
  conversationId: string,
  organizationId: string
): Promise<ConversationMessagesResponse> => {
  try {
    // Verificar que la conversación existe y pertenece a la organización
    const conversation = await import("../models/ConversationModel").then(
      (module) => module.default
    );

    const conversationDoc = await conversation
      .findOne({
        _id: conversationId,
        organization: organizationId,
      })
      .lean();

    if (!conversationDoc) {
      return {
        success: false,
        data: {
          conversationId,
          messages: [],
          totalMessages: 0,
          conversationInfo: {
            title: "",
            participants: {},
            createdAt: "",
            updatedAt: "",
          },
        },
        error: "Conversación no encontrada",
      };
    }

    // Obtener el total de mensajes
    const totalMessages = await Message.countDocuments({
      conversation: conversationId,
    });

    // Si no hay mensajes, retornar respuesta vacía
    if (totalMessages === 0) {
      return {
        success: true,
        data: {
          conversationId,
          messages: [],
          totalMessages: 0,
          conversationInfo: {
            title: conversationDoc.title,
            participants: conversationDoc.participants,
            createdAt: conversationDoc.createdAt.toISOString(),
            updatedAt: conversationDoc.updatedAt.toISOString(),
          },
        },
      };
    }

    // Obtener TODOS los mensajes (sin paginación)
    const allMessages = await Message.find({ conversation: conversationId })
      .sort({ timestamp: 1 }) // Orden cronológico ascendente
      .lean();

    // Formatear mensajes para el contexto
    const formattedMessages = allMessages.map((msg) => ({
      _id: msg._id,
      from: msg.from,
      to: msg.to,
      message: msg.message,
      mediaUrl: msg.mediaUrl,
      type: msg.type,
      timestamp: msg.timestamp,
      direction: msg.direction,
      isRead: msg.isRead,
      possibleName: msg.possibleName,
      filename: msg.filename,
      mimeType: msg.mimeType,
      latitude: msg.latitude,
      longitude: msg.longitude,
    }));

    return {
      success: true,
      data: {
        conversationId,
        messages: formattedMessages,
        totalMessages,
        conversationInfo: {
          title: conversationDoc.title,
          participants: conversationDoc.participants,
          createdAt: conversationDoc.createdAt.toISOString(),
          updatedAt: conversationDoc.updatedAt.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Error obteniendo mensajes de conversación:", error);
    return {
      success: false,
      data: {
        conversationId,
        messages: [],
        totalMessages: 0,
        conversationInfo: {
          title: "",
          participants: {},
          createdAt: "",
          updatedAt: "",
        },
      },
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
};
