import { Request, Response } from "express";
import ConversationModel from "../../models/ConversationModel";
import MessageModel from "../../models/MessageModel";

export const deleteConversation = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Delete all messages
    await MessageModel.deleteMany({ conversation: id });

    // Delete conversation
    const conversation = await ConversationModel.findByIdAndDelete(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversación eliminada correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al eliminar la conversación",
    });
  }
};
