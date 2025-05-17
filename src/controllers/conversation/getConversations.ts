import { Request, Response } from "express";
import Conversation from "../../models/ConversationModel";
import ConversationPipeline from "../../models/ConversationPipelineModel";
import Message from "../../models/MessageModel";

/**
 * Obtiene lista de conversaciones para una organización
 */
export const getConversations = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const organizationId = req.user?.organizationId;
    const {
      page = 1,
      limit = 20,
      search,
      isResolved,
      assignedTo,
      tags,
    } = req.query;

    const queryConditions: any = { organization: organizationId };

    // Filtro por estado de resolución
    if (isResolved !== undefined) {
      queryConditions.isResolved = isResolved === "true";
    }

    // Filtro por usuario asignado
    if (assignedTo) {
      queryConditions.assignedTo = assignedTo;
    }

    // Filtro por etiquetas
    if (tags) {
      queryConditions.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    // Búsqueda por título
    if (search) {
      queryConditions.title = { $regex: search, $options: "i" };
    }

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const conversations = await Conversation.find(queryConditions)
      .sort({ lastMessageTimestamp: -1 })
      .skip(skip)
      .limit(limitNumber)
      .populate("lastMessage")
      .populate("assignedTo", "name email");

    // Procesar las conversaciones para manejar los casos donde participants.contact.reference es string
    const processedConversations = conversations.map((conversation: any) => {
      const conversationObj = conversation.toObject();

      // Procesar el participante contacto si tiene un número de teléfono como referencia
      if (
        conversationObj.participants &&
        conversationObj.participants.contact &&
        typeof conversationObj.participants.contact.reference === "string"
      ) {
        // Agregar información adicional al contacto
        conversationObj.participants.contact.displayInfo = {
          phone: conversationObj.participants.contact.reference,
          name: conversationObj.participants.contact.reference, // Usar el teléfono como nombre por defecto
        };
      }

      return conversationObj;
    });

    const total = await Conversation.countDocuments(queryConditions);

    return res.status(200).json({
      success: true,
      data: processedConversations,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error: any) {
    console.error("Error al obtener conversaciones:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener conversaciones",
      error: error.message,
    });
  }
};

/**
 * Obtiene conversaciones agrupadas por etapas para la vista Kanban
 */
export const getConversationsKanban = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const organizationId = req.user?.organizationId;
    const { pipelineId, isResolved, assignedTo, tags, search } = req.query;

    // Si no se proporciona un pipelineId, usar el predeterminado
    let pipeline;
    if (pipelineId) {
      pipeline = await ConversationPipeline.findOne({
        _id: pipelineId,
        organization: organizationId,
      });
    } else {
      pipeline = await ConversationPipeline.findOne({
        organization: organizationId,
        isDefault: true,
      });
    }

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el pipeline especificado",
      });
    }

    // Preparamos la respuesta con las etapas vacías
    const kanbanData = pipeline.stages.map((stage: any) => ({
      stageId: stage._id,
      stageName: stage.name,
      stageOrder: stage.order,
      stageColor: stage.color,
      conversations: [] as any[],
    }));

    // Filtros base para todas las etapas
    const baseQueryConditions: any = {
      organization: organizationId,
      pipeline: pipeline._id,
    };

    // Filtro por estado de resolución
    if (isResolved !== undefined) {
      baseQueryConditions.isResolved = isResolved === "true";
    }

    // Filtro por usuario asignado
    if (assignedTo) {
      baseQueryConditions.assignedTo = assignedTo;
    }

    // Filtro por etiquetas
    if (tags) {
      baseQueryConditions.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    // Búsqueda por título
    if (search) {
      baseQueryConditions.title = { $regex: search, $options: "i" };
    }

    // Obtener todas las conversaciones para este pipeline que cumplan con los filtros
    const allConversations = await Conversation.find(baseQueryConditions)
      .sort({ lastMessageTimestamp: -1 })
      .populate("lastMessage")
      .populate("assignedTo", "name email profilePicture");

    console.log(allConversations);

    // Distribuir las conversaciones en las etapas correspondientes
    for (const conversation of allConversations) {
      const stageIndex = conversation.currentStage;
      // Asegurarse de que el índice de etapa es válido
      if (stageIndex >= 0 && stageIndex < kanbanData.length) {
        kanbanData[stageIndex].conversations.push(conversation);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        pipeline: {
          id: pipeline._id,
          name: pipeline.name,
          isDefault: pipeline.isDefault,
        },
        stages: kanbanData,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener conversaciones para Kanban:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener conversaciones para vista Kanban",
      error: error.message,
    });
  }
};

/**
 * Obtiene una conversación específica por ID, con sus mensajes
 */
export const getConversationById = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate("assignedTo", "name email profilePicture")
      .populate("pipeline");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada",
      });
    }

    // Procesar conversación
    const conversationObj: any = conversation.toObject();

    // Procesar el participante contacto si tiene un número de teléfono como referencia
    if (
      conversationObj.participants &&
      conversationObj.participants.contact &&
      typeof conversationObj.participants.contact.reference === "string"
    ) {
      // Agregar información adicional al contacto
      conversationObj.participants.contact.displayInfo = {
        phone: conversationObj.participants.contact.reference,
        name: conversationObj.participants.contact.reference, // Usar el teléfono como nombre por defecto
      };
    }

    // Obtener mensajes de la conversación
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Cambiar el orden para mostrar los mensajes cronológicamente (más antiguos primero)
    const messages = await Message.find({ conversation: id })
      .sort({ timestamp: 1 }) // Cambiando de -1 a 1 para ordenar ascendentemente
      .skip(skip)
      .limit(limitNumber);

    const totalMessages = await Message.countDocuments({ conversation: id });

    return res.status(200).json({
      success: true,
      data: {
        conversation: conversationObj,
        messages,
        pagination: {
          total: totalMessages,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(totalMessages / limitNumber),
        },
      },
    });
  } catch (error: any) {
    console.error("Error al obtener conversación:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener conversación",
      error: error.message,
    });
  }
};
