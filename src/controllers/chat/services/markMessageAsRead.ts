import { Request, Response } from "express";
import MessageModel from "../../../models/MessageModel";
import ConversationModel from "../../../models/ConversationModel";

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

    // Resetear el contador de no leídos en conversaciones relacionadas con este contacto
    try {
      const convResult = await ConversationModel.updateMany(
        {
          organization: organizationId,
          "participants.contact.reference": body.contact,
          unreadCount: { $gt: 0 },
        },
        { $set: { unreadCount: 0 } }
      );
      // Success: no noisy logs
    } catch (convErr) {
      console.error("Failed to reset conversations unreadCount by contact", convErr);
    }

    res.status(200).json({ message: "Messages marked as read", updated });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Error marking messages as read" });
  }
};
