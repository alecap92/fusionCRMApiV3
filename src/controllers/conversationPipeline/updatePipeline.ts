import { Request, Response } from "express";
import ConversationPipeline from "../../models/ConversationPipelineModel";
import Conversation from "../../models/ConversationModel";

/**
 * Actualiza un pipeline de conversación
 */
export const updatePipeline = async (
  req: Request & { organization?: any },
  res: Response
) => {
  try {
    const { id } = req.params;
    const { name, stages, isDefault } = req.body;
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

    // Actualizar campos si se proporcionan
    if (name) pipeline.name = name;

    // Si este pipeline será el predeterminado, desactivar cualquier otro predeterminado
    if (isDefault !== undefined && isDefault && !pipeline.isDefault) {
      await ConversationPipeline.updateMany(
        { organization: organizationId, isDefault: true },
        { isDefault: false }
      );
      pipeline.isDefault = true;
    } else if (isDefault !== undefined) {
      pipeline.isDefault = isDefault;
    }

    // Si hay nuevas etapas, actualizarlas
    if (stages && Array.isArray(stages)) {
      // Guardar las etapas existentes para mapeo
      const existingStages = [...pipeline.stages];

      // Actualizar las etapas
      pipeline.stages = stages.map((stage: any, index: number) => ({
        name: stage.name,
        order: stage.order !== undefined ? stage.order : index,
        color: stage.color || "#808080",
        autoAssign: stage.autoAssign || false,
        assignToTeam: stage.assignToTeam || null,
      }));

      // Si se eliminaron etapas, actualizar las conversaciones afectadas
      if (existingStages.length > pipeline.stages.length) {
        // Obtenemos el máximo orden de las nuevas etapas
        const maxStageOrder = Math.max(
          ...pipeline.stages.map((s: any) => s.order)
        );

        // Actualizamos las conversaciones que estaban en etapas eliminadas para moverlas a la última etapa
        await Conversation.updateMany(
          {
            pipeline: id,
            currentStage: { $gte: pipeline.stages.length },
          },
          { currentStage: maxStageOrder }
        );
      }
    }

    await pipeline.save();

    return res.status(200).json({
      success: true,
      data: pipeline,
      message: "Pipeline actualizado exitosamente",
    });
  } catch (error: any) {
    console.error("Error al actualizar pipeline:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar pipeline",
      error: error.message,
    });
  }
};

/**
 * Elimina un pipeline de conversación
 */
export const deletePipeline = async (
  req: Request & { organization?: any },
  res: Response
) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization;

    // Verificar si es el único pipeline o si es el predeterminado
    const pipelineCount = await ConversationPipeline.countDocuments({
      organization: organizationId,
    });

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

    // No permitir eliminar si es el único pipeline
    if (pipelineCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar el único pipeline existente",
      });
    }

    // Verificar si hay conversaciones usando este pipeline
    const conversationsCount = await Conversation.countDocuments({
      pipeline: id,
    });

    if (conversationsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el pipeline porque hay ${conversationsCount} conversaciones asociadas`,
      });
    }

    // Eliminar el pipeline
    await ConversationPipeline.deleteOne({ _id: id });

    // Si era el predeterminado, establecer otro como predeterminado
    if (pipeline.isDefault) {
      const anotherPipeline = await ConversationPipeline.findOne({
        organization: organizationId,
        _id: { $ne: id },
      });
      if (anotherPipeline) {
        anotherPipeline.isDefault = true;
        await anotherPipeline.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Pipeline eliminado exitosamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar pipeline:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar pipeline",
      error: error.message,
    });
  }
};
