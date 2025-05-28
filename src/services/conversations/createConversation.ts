import ConversationModel from "../../models/ConversationModel";
import ConversationPipelineModel from "../../models/ConversationPipelineModel";

interface ICreateConversation {
  organizationId: string;
  userId: string;
  to: string;
  pipelineId: string;
  assignedTo: string;
}

export const createConversation = async (data: ICreateConversation) => {
  try {
    const { organizationId, userId, to, pipelineId, assignedTo } = data;

    const newConversation = await ConversationModel.create({
      title: `Conversación con ${to}`,
      organization: organizationId,
      participants: {
        user: {
          type: "User",
          reference: userId,
        },
        contact: {
          type: "Contact",
          reference: to,
        },
      },
      pipeline: pipelineId,
      currentStage: 0,
      assignedTo: assignedTo,
      priority: "medium",
      firstContactTimestamp: new Date(),
    });

    return newConversation;
  } catch (error) {
    console.log(error);
  }
};

/**
 * Reabre una conversación cuando llega un mensaje entrante
 * @param conversation - La conversación a evaluar para reapertura
 * @returns boolean - true si se reabrió la conversación
 */
export const reopenConversationIfClosed = async (
  conversation: any
): Promise<boolean> => {
  try {
    // Obtener el pipeline de la conversación
    const pipeline = await ConversationPipelineModel.findById(
      conversation.pipeline
    );

    if (!pipeline) {
      console.error(
        "Pipeline no encontrado para la conversación:",
        conversation._id
      );
      return false;
    }

    // Buscar el stage de "Cerrado" o "Finalizado" de manera dinámica
    const closedStage = pipeline.stages.find(
      (stage: any) =>
        stage.name.toLowerCase().includes("cerrado") ||
        stage.name.toLowerCase().includes("finalizado") ||
        stage.name.toLowerCase().includes("resuelto") ||
        stage.name.toLowerCase().includes("completado")
    );

    // Si no encuentra un stage específico de cerrado, usar el último stage del pipeline
    const closedStageIndex = closedStage
      ? closedStage.order
      : pipeline.stages.length - 1;

    // Verificar si la conversación está en un estado cerrado
    const isConversationClosed =
      conversation.currentStage === closedStageIndex || conversation.isResolved;

    if (isConversationClosed) {
      // Reabrir la conversación
      conversation.currentStage = 0; // Mover a "Sin Atender"
      conversation.isResolved = false;

      // Agregar metadata de reapertura
      if (!conversation.metadata) {
        conversation.metadata = [];
      }

      conversation.metadata.push({
        key: "auto-reopen",
        value: `Reabierta automáticamente por mensaje entrante - ${new Date().toISOString()}`,
      });

      await conversation.save();

      console.log(`Conversación ${conversation._id} reabierta automáticamente`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error al reabrir conversación:", error);
    return false;
  }
};
