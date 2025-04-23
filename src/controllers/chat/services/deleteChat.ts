// controllers/messages/deleteChat.ts

import { Request, Response } from "express";
import MessageModel from "../../../models/MessageModel";
import { deleteMediaFromCloudinary } from "../../../utils/cloudinaryUtils";

export const deleteChat = async (req: Request, res: Response) => {
  const id = req.params.id;
  const organizationId = req.user?.organizationId;

  if (!req.user) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }

  if (!id) {
    return res.status(400).json({ error: "Se requiere el contacto" });
  }

  try {
    // Encontrar los mensajes que serán eliminados
    const messagesToDelete = await MessageModel.find({
      organization: organizationId,
      $or: [{ from: id }, { to: id }],
    });

    // Extraer los mediaIds de los mensajes
    const mediaIds = messagesToDelete
      .filter((msg) => msg.mediaId)
      .map((msg) => msg.mediaId as string);

    // Eliminar los archivos media de Cloudinary
    if (mediaIds.length > 0) {
      await deleteMediaFromCloudinary(mediaIds);
    }

    // Eliminar los mensajes de la base de datos
    const deletedMessages = await MessageModel.deleteMany({
      organization: organizationId,
      $or: [{ from: id }, { to: id }],
    });

    res.status(200).json({
      message: "Chat eliminado",
      deletedMessages,
    });
  } catch (error) {
    console.error("Error al eliminar el chat:", error);
    res.status(500).json({ error: "Error al eliminar el chat" });
  }
};
