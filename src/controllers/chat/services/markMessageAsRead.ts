import { Request, Response } from "express";
import MessageModel from "../../../models/MessageModel";

export const markMessagesAsRead = async (req: Request, res: Response) => {
  const body = req.body;
  const organizationId = req.user?.organizationId;
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  if (!body.contact) {
    return res.status(400).json({ error: "Contact is required" });
  }

  try {
    // Actualizar los mensajes no leídos entrantes para marcarlos como leídos
    const updated = await MessageModel.updateMany(
      {
        isRead: false,
        organization: organizationId,
        $or: [{ from: body.contact }, { to: body.contact }],
      },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: "Messages marked as read", updated });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Error marking messages as read" });
  }
};
