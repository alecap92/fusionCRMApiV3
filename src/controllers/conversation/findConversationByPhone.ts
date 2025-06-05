import { Request, Response } from "express";
import ConversationModel from "../../models/ConversationModel";

export const findConversationByPhone = async (req: Request, res: Response) => {
  const { phone } = req.query;
  const organizationId = req.user?.organizationId;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "El parámetro phone es requerido",
    });
  }

  try {
    // Buscar conversación por número de teléfono
    const conversation = await ConversationModel.findOne({
      "participants.contact.reference": phone,
      organization: organizationId,
    })
      .populate("assignedTo", "name email profilePicture")
      .populate("pipeline")
      .populate("lastMessage");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "No se encontró conversación para este número",
      });
    }

    // Procesar la conversación
    const conversationObj: any = conversation.toObject();

    if (
      conversationObj.participants &&
      conversationObj.participants.contact &&
      typeof conversationObj.participants.contact.reference === "string"
    ) {
      conversationObj.participants.contact.displayInfo = {
        phone: conversationObj.participants.contact.reference,
        name: conversationObj.participants.contact.reference,
      };
    }

    conversationObj.lastMessageTimestamp =
      conversationObj.lastMessage?.timestamp;
    conversationObj.mobile = conversationObj.participants.contact.reference;

    return res.status(200).json({
      success: true,
      conversation: conversationObj,
    });
  } catch (error) {
    console.error("Error al buscar conversación por teléfono:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};
