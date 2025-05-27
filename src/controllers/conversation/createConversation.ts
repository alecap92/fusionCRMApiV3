import { Request, Response } from "express";
import Conversation from "../../models/ConversationModel";
import ConversationPipeline from "../../models/ConversationPipelineModel";

/**
 * Crea una nueva conversación
 */
export const createConversation = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const {
      title,
      participants,
      pipelineId,
      initialStage,
      assignedTo,
      priority = "medium",
      tags = [],
      metadata = [],
    } = req.body;

    const organizationId = req.user?.organizationId;
    const userId = req.user?._id;

    if (!title || !participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message:
          "Título y participantes son requeridos. Los participantes deben ser un array.",
      });
    }

    // Validar que cada participante tenga tipo y referencia
    for (const participant of participants) {
      if (!participant.type || !participant.reference) {
        return res.status(400).json({
          success: false,
          message: "Cada participante debe tener un tipo y una referencia",
        });
      }
    }

    // Si no se proporciona un pipelineId, buscar el pipeline predeterminado
    let pipeline = pipelineId;
    if (!pipelineId) {
      const defaultPipeline = await ConversationPipeline.findOne({
        organization: organizationId,
        isDefault: true,
      });

      if (!defaultPipeline) {
        return res.status(400).json({
          success: false,
          message:
            "No se encontró un pipeline predeterminado. Se debe proporcionar un pipelineId.",
        });
      }

      pipeline = defaultPipeline._id;
    }

    // Crear la conversación
    const conversation = new Conversation({
      title,
      organization: organizationId,
      participants,
      pipeline,
      currentStage: initialStage || 0,
      assignedTo: assignedTo || userId,
      priority,
      tags,
      firstContactTimestamp: new Date(),
      metadata,
    });

    await conversation.save();

    return res.status(201).json({
      success: true,
      data: conversation,
      message: "Conversación creada exitosamente",
    });
  } catch (error: any) {
    console.error("Error al crear conversación:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear conversación",
      error: error.message,
    });
  }
};
