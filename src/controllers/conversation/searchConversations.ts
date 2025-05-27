import { Request, Response } from "express";
import ConversationModel from "../../models/ConversationModel";
import MessageModel from "../../models/MessageModel";

export const searchConversations = async (req: Request, res: Response) => {
  const { query } = req.query;
  const organizationId = req.user?.organizationId;

  console.log(req.query);

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "El parámetro de búsqueda es requerido",
    });
  }
  try {
    const mensajes = await MessageModel.find({
      $or: [
        { from: { $regex: query, $options: "i" } },
        { to: { $regex: query, $options: "i" } },
        { message: { $regex: query, $options: "i" } },
        { possibleName: { $regex: query, $options: "i" } },
      ],
      organization: organizationId,
    })
      .limit(10)
      .sort({ timestamp: -1 });

    return res.status(200).json({
      success: true,
      mensajes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al buscar conversaciones",
    });
  }
};
