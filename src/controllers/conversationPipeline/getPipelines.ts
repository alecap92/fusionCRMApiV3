import { Request, Response } from "express";
import ConversationPipeline from "../../models/ConversationPipelineModel";

/**
 * Obtiene la lista de pipelines de conversación para una organización
 */
export const getPipelines = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const organizationId = req.user?.organizationId;

    const pipelines = await ConversationPipeline.find({
      organization: organizationId,
    });

    return res.status(200).json({
      success: true,
      data: pipelines,
      count: pipelines.length,
    });
  } catch (error: any) {
    console.error("Error al obtener pipelines:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener pipelines",
      error: error.message,
    });
  }
};

/**
 * Obtiene un pipeline específico por ID
 */
export const getPipelineById = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const pipeline = await ConversationPipeline.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "Pipeline no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      data: pipeline,
    });
  } catch (error: any) {
    console.error("Error al obtener pipeline:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener pipeline",
      error: error.message,
    });
  }
};

/**
 * Obtiene el pipeline predeterminado de la organización
 */
export const getDefaultPipeline = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const organizationId = req.user?.organizationId;

    const pipeline = await ConversationPipeline.findOne({
      organization: organizationId,
      isDefault: true,
    });

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: "No hay pipeline predeterminado configurado",
      });
    }

    return res.status(200).json({
      success: true,
      data: pipeline,
    });
  } catch (error: any) {
    console.error("Error al obtener pipeline predeterminado:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener pipeline predeterminado",
      error: error.message,
    });
  }
};
