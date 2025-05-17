import { Request, Response } from "express";
import ConversationPipeline from "../../models/ConversationPipelineModel";

/**
 * Crea un nuevo pipeline para conversaciones
 */
export const createPipeline = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const { name, stages, isDefault = false } = req.body;
    const organizationId = req.user?.organizationId;

    if (!name || !stages || !Array.isArray(stages)) {
      return res.status(400).json({
        success: false,
        message:
          "Nombre y etapas son requeridos. Las etapas deben ser un array.",
      });
    }

    // Validar que las etapas tengan nombre y orden
    for (const stage of stages) {
      if (!stage.name || stage.order === undefined) {
        return res.status(400).json({
          success: false,
          message: "Cada etapa debe tener un nombre y un orden",
        });
      }
    }

    // Si este pipeline será el predeterminado, desactivar cualquier otro predeterminado
    if (isDefault) {
      await ConversationPipeline.updateMany(
        { organization: organizationId, isDefault: true },
        { isDefault: false }
      );
    }

    const pipeline = new ConversationPipeline({
      name,
      organization: organizationId,
      stages: stages.map((stage: any, index: number) => ({
        name: stage.name,
        order: stage.order || index,
        color: stage.color || "#808080",
        autoAssign: stage.autoAssign || false,
        assignToTeam: stage.assignToTeam || null,
      })),
      isDefault,
    });

    await pipeline.save();

    return res.status(201).json({
      success: true,
      data: pipeline,
      message: "Pipeline creado exitosamente",
    });
  } catch (error: any) {
    console.error("Error al crear pipeline:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear pipeline",
      error: error.message,
    });
  }
};
