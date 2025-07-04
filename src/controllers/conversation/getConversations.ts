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

    /*
     * 1. Traer las conversaciones de forma "lean" para reducir overhead.
     * 2. Obtener sólo los campos necesarios.
     */
    const conversations = await Conversation.find(queryConditions)
      .sort({ lastMessageTimestamp: -1 })
      .skip(skip)
      .limit(limitNumber)
      .select(
        "title participants lastMessageTimestamp pipeline currentStage assignedTo isResolved tags unreadCount"
      )
      .populate("assignedTo", "name email firstName lastName")
      .lean();

    // Si no hay conversaciones, responder inmediatamente
    if (!conversations.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: pageNumber,
          limit: limitNumber,
          pages: 0,
        },
      });
    }

    /* ---------- Contactos en lote ---------- */
    const references: string[] = [
      ...new Set(
        conversations
          .map((c: any) => c?.participants?.contact?.reference)
          .filter(Boolean)
      ),
    ];

    const contactsRaw = await ContactModel.find({
      organizationId,
      $or: [
        {
          "properties.key": "mobile",
          "properties.value": { $in: references },
        },
        {
          "properties.key": "phone",
          "properties.value": { $in: references },
        },
      ],
    })
      .select("properties")
      .lean();

    const contactsByPhone: Record<string, any> = {};
    for (const contact of contactsRaw) {
      if (!contact?.properties) continue;
      for (const prop of contact.properties) {
        if (
          (prop.key === "mobile" || prop.key === "phone") &&
          references.includes(prop.value)
        ) {
          contactsByPhone[prop.value] = contact;
        }
      }
    }

    /* ---------- Último mensaje en lote ---------- */
    const conversationIds = conversations.map((c: any) => c._id);
    const lastMessagesAgg = await Message.aggregate([
      { $match: { conversation: { $in: conversationIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$conversation",
          doc: { $first: "$$ROOT" },
        },
      },
    ]);

    const lastMessagesByConversation: Record<string, any> = {};
    for (const lm of lastMessagesAgg) {
      lastMessagesByConversation[lm._id.toString()] = lm.doc;
    }

    /* ---------- Construir respuesta ---------- */
    const processedConversations = conversations.map((conversation: any) => {
      const reference = conversation?.participants?.contact?.reference;
      const contact = reference ? contactsByPhone[reference] : null;

      // Display info de contacto
      if (reference) {
        const findProp = (key: string) =>
          contact?.properties?.find((p: any) => p.key === key)?.value;

        conversation.participants.contact.displayInfo = {
          mobile: reference,
          name: findProp("firstName") || reference,
          lastName: findProp("lastName") || "",
          email: findProp("email") || "",
          position: findProp("position") || "",
          contactId: contact?._id || null,
        };
      }

      // Añadir mobile helper y último mensaje
      conversation.mobile = reference;
      const lm = lastMessagesByConversation[conversation._id.toString()];
      conversation.lastMessage = lm || null;
      conversation.lastMessageTimestamp =
        lm?.timestamp || conversation.lastMessageTimestamp;

      return conversation;
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

        const conversations = await Conversation.find(stageQueryConditions)
          .sort({ lastMessageTimestamp: -1 })
          .skip(skip)
          .limit(limitNumber)
          .populate("lastMessage")
          .populate("assignedTo", "firstName lastName email profilePicture");

        const total = await Conversation.countDocuments(stageQueryConditions);
        const pages = Math.ceil(total / limitNumber);

        // Procesar las conversaciones
        const processedConversations = conversations.map(
          async (conversation: any) => {
            const conversationObj = conversation.toObject();

            // Buscar el contacto si existe
            let contact = null;
            if (
              conversationObj.participants &&
              conversationObj.participants.contact &&
              typeof conversationObj.participants.contact.reference === "string"
            ) {
              try {
                contact = await ContactModel.findOne({
                  $or: [
                    {
                      "properties.key": "mobile",
                      "properties.value":
                        conversationObj.participants.contact.reference,
                    },
                    {
                      "properties.key": "phone",
                      "properties.value":
                        conversationObj.participants.contact.reference,
                    },
                  ],
                  organizationId: conversationObj.organization,
                });
              } catch (error) {
                console.error("Error buscando contacto:", error);
              }

              // Agregar información adicional al contacto
              conversationObj.participants.contact.displayInfo = {
                mobile: conversationObj.participants.contact.reference,
                name:
                  contact?.properties?.find((p: any) => p.key === "firstName")
                    ?.value || conversationObj.participants.contact.reference,
                lastName:
                  contact?.properties?.find((p: any) => p.key === "lastName")
                    ?.value || "",
                email:
                  contact?.properties?.find((p: any) => p.key === "email")
                    ?.value || "",
                position:
                  contact?.properties?.find((p: any) => p.key === "position")
                    ?.value || "",
                contactId: contact?._id || null,
              };
            }

            conversationObj.lastMessageTimestamp =
              conversationObj.lastMessage?.timestamp;
            conversationObj.mobile =
              conversationObj.participants.contact.reference;

            return conversationObj;
          }
        );

        const processedConversationsResolved = await Promise.all(
          processedConversations
        );

        // Obtener el último mensaje para cada conversación
        const conversationsWithLastMessage = await Promise.all(
          processedConversationsResolved.map(async (conversation) => {
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
        .populate("assignedTo", "firstName lastName email profilePicture");

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

    const conversation: any = await Conversation.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate("assignedTo", "name email profilePicture")
      .populate("pipeline")
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada",
      });
    }

    // Buscar contacto (único query)
    let contact: any = null;
    const reference = conversation?.participants?.contact?.reference;
    if (reference) {
      try {
        contact = await ContactModel.findOne({
          $or: [
            {
              "properties.key": "mobile",
              "properties.value": { $regex: reference },
            },
            {
              "properties.key": "phone",
              "properties.value": { $regex: reference },
            },
            {
              "properties.key": "email",
              "properties.value": { $regex: reference },
            },
          ],
        })
          .select("properties")
          .lean();
      } catch (error) {
        console.error("Error obteniendo el contacto:", error);
      }
    }

    // Enriquecer conversación con info de contacto
    if (reference) {
      const findProp = (key: string) =>
        contact?.properties?.find((p: any) => p.key === key)?.value;

      conversation.participants.contact.displayInfo = {
        mobile: reference,
        name: findProp("firstName") || reference,
        lastName: findProp("lastName") || "",
        email: findProp("email") || "",
        position: findProp("position") || "",
        contactId: contact?._id || null,
      };
    }

    conversation.mobile = reference || "SIN MOVIL";

    /* ---------- Mensajes paginados directamente desde Mongo ---------- */
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const totalMessages = await Message.countDocuments({ conversation: id });

    const messagesDesc = await Message.find({ conversation: id })
      .sort({ timestamp: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    // Revertimos para mantener orden cronológico ascendente
    const messages = messagesDesc.reverse();

    return res.status(200).json({
      success: true,
      data: {
        conversation,
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
