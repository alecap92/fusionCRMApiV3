import { Request, Response } from "express";
import Conversation from "../../models/ConversationModel";
import ConversationPipeline from "../../models/ConversationPipelineModel";
import Message from "../../models/MessageModel";
import ContactModel from "../../models/ContactModel";

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
      .populate("assignedTo", "name email firstName lastName");

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
          mobile: conversationObj.participants.contact.reference,
          name: conversationObj.participants.contact.reference, // Usar el teléfono como nombre por defecto
        };
      }

      // Add last message timestamp
      conversationObj.lastMessageTimestamp =
        conversationObj.lastMessage?.timestamp;

      conversationObj.mobile = conversationObj.participants.contact.reference;

      return conversationObj;
    });

    const total = await Conversation.countDocuments(queryConditions);

    // Obtener el último mensaje para cada conversación
    const conversationsWithLastMessage = await Promise.all(
      processedConversations.map(async (conversation) => {
        const lastMessage = await Message.findOne({
          $or: [
            {
              from: conversation.participants.contact.reference,
            },
            {
              to: conversation.participants.contact.reference,
            },
          ],
        }).sort({ timestamp: -1 });

        return {
          ...conversation,
          lastMessage: lastMessage || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: conversationsWithLastMessage,
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
    const {
      pipelineId,
      isResolved,
      assignedTo,
      tags,
      search,
      page = "1",
      limit = "50",
      stageId,
    } = req.query;

    // Convertir y validar los números
    const pageNumber = Math.max(1, parseInt(page as string));
    const limitNumber = Math.max(50, parseInt(limit as string));

    console.log("DEBUG Kanban Request:", {
      pipelineId,
      stageId,
      pageNumber,
      limitNumber,
      organizationId,
    });

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

    console.log("DEBUG Pipeline found:", {
      pipelineId: pipeline?._id,
      stagesCount: pipeline?.stages?.length,
    });

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
      pagination: {
        page: 1,
        limit: parseInt(limit as string, 10),
        total: 0,
        pages: 0,
        hasMore: false,
      },
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

    // Si se especifica un stageId, solo cargar conversaciones para esa etapa
    if (stageId) {
      const stageIndex = pipeline.stages.findIndex(
        (stage: any) => stage._id.toString() === stageId
      );

      if (stageIndex !== -1) {
        const stageQueryConditions = {
          ...baseQueryConditions,
          currentStage: stageIndex,
        };

        const skip = (pageNumber - 1) * limitNumber;

        console.log("DEBUG Stage query:", {
          stageId,
          stageIndex,
          skip,
          limitNumber,
          conditions: stageQueryConditions,
        });

        const conversations = await Conversation.find(stageQueryConditions)
          .sort({ lastMessageTimestamp: -1 })
          .skip(skip)
          .limit(limitNumber)
          .populate("lastMessage")
          .populate("assignedTo", "name email profilePicture");

        const total = await Conversation.countDocuments(stageQueryConditions);
        const pages = Math.ceil(total / limitNumber);

        console.log("DEBUG Query results:", {
          found: conversations.length,
          total,
          pages,
          hasMore: pageNumber < pages,
        });

        // Procesar las conversaciones
        const processedConversations = conversations.map(
          (conversation: any) => {
            const conversationObj = conversation.toObject();

            if (
              conversationObj.participants &&
              conversationObj.participants.contact &&
              typeof conversationObj.participants.contact.reference === "string"
            ) {
              conversationObj.participants.contact.displayInfo = {
                mobile: conversationObj.participants.contact.reference,
                name: conversationObj.participants.contact.reference,
              };
            }

            conversationObj.lastMessageTimestamp =
              conversationObj.lastMessage?.timestamp;
            conversationObj.mobile =
              conversationObj.participants.contact.reference;

            return conversationObj;
          }
        );

        // Obtener el último mensaje para cada conversación
        const conversationsWithLastMessage = await Promise.all(
          processedConversations.map(async (conversation) => {
            const lastMessage = await Message.findOne({
              $or: [
                { from: conversation.participants.contact.reference },
                { to: conversation.participants.contact.reference },
              ],
            }).sort({ timestamp: -1 });

            return {
              ...conversation,
              lastMessage: lastMessage || null,
            };
          })
        );

        return res.status(200).json({
          success: true,
          data: {
            stageId,
            conversations: conversationsWithLastMessage,
            pagination: {
              page: pageNumber,
              limit: limitNumber,
              total,
              pages,
              hasMore: pageNumber < pages,
            },
          },
        });
      }
    }

    // Carga inicial: obtener las primeras conversaciones de cada etapa
    for (let i = 0; i < pipeline.stages.length; i++) {
      const stageQueryConditions = {
        ...baseQueryConditions,
        currentStage: i,
      };

      const conversations = await Conversation.find(stageQueryConditions)
        .sort({ lastMessageTimestamp: -1 })
        .limit(limitNumber)
        .populate("lastMessage")
        .populate("assignedTo", "name email profilePicture");

      const total = await Conversation.countDocuments(stageQueryConditions);
      const pages = Math.ceil(total / limitNumber);

      // Procesar las conversaciones
      const processedConversations = conversations.map((conversation: any) => {
        const conversationObj = conversation.toObject();

        if (
          conversationObj.participants &&
          conversationObj.participants.contact &&
          typeof conversationObj.participants.contact.reference === "string"
        ) {
          conversationObj.participants.contact.displayInfo = {
            mobile: conversationObj.participants.contact.reference,
            name: conversationObj.participants.contact.reference,
          };
        }

        conversationObj.lastMessageTimestamp =
          conversationObj.lastMessage?.timestamp;
        conversationObj.mobile = conversationObj.participants.contact.reference;

        return conversationObj;
      });

      // Obtener el último mensaje para cada conversación
      const conversationsWithLastMessage = await Promise.all(
        processedConversations.map(async (conversation) => {
          const lastMessage = await Message.findOne({
            $or: [
              { from: conversation.participants.contact.reference },
              { to: conversation.participants.contact.reference },
            ],
          }).sort({ timestamp: -1 });

          return {
            ...conversation,
            lastMessage: lastMessage || null,
          };
        })
      );

      kanbanData[i].conversations = conversationsWithLastMessage;
      kanbanData[i].pagination = {
        page: 1,
        limit: limitNumber,
        total,
        pages,
        hasMore: pages > 1,
      };
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
    const { page = 1, limit = 500 } = req.query;

    const conversation = await Conversation.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate("assignedTo", "name email profilePicture")
      .populate("pipeline")
      .populate("lastMessage");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada",
      });
    }

    // Buscar si el contacto existe en la base de datos
    let contact = null;
    try {
      if (
        conversation.participants &&
        conversation.participants.contact &&
        conversation.participants.contact.reference
      ) {
        contact = await ContactModel.findOne({
          $or: [
            {
              "properties.key": "mobile",
              "properties.value": {
                $regex: conversation.participants.contact.reference,
              },
            },
            {
              "properties.key": "phone",
              "properties.value": {
                $regex: conversation.participants.contact.reference,
              },
            },
            {
              "properties.key": "email",
              "properties.value": {
                $regex: conversation.participants.contact.reference,
              },
            },
          ],
        });
      }
    } catch (error) {
      console.error("Error obteniendo el contacto:", error);
      // Continuamos con contact = null
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
        mobile: conversationObj.participants.contact.reference,
        name: conversationObj.participants.contact.reference, // Usar el teléfono como nombre por defecto
      };

      conversationObj.participants.contact.contactId = contact?._id || null;
    }

    // Agregar lastMessageTimestamp y mobile
    conversationObj.lastMessageTimestamp =
      conversationObj.lastMessage?.timestamp;
    conversationObj.mobile =
      conversationObj.participants.contact.reference || "SIN MOVIL";

    // Obtener mensajes de la conversación
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const totalMessages = await Message.countDocuments({ conversation: id });

    // Obtener todos los mensajes ordenados cronológicamente y luego aplicar paginación
    const allMessages = await Message.find({ conversation: id })
      .sort({ timestamp: 1 }) // Orden cronológico (más antiguos primero)
      .exec();

    // Aplicar paginación manualmente para mantener el orden cronológico
    const startIndex = Math.max(
      0,
      allMessages.length - pageNumber * limitNumber
    );
    const endIndex = allMessages.length - (pageNumber - 1) * limitNumber;

    const messages = allMessages.slice(startIndex, endIndex);

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
