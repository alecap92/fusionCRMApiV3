import ConversationModel from "../../models/ConversationModel";

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
