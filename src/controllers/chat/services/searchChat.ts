import { Request, Response } from "express";
import IncomingMessage from "../../../models/IncomingMessageModel";
import OutgoingMessage from "../../../models/OutgoingMessageModel";
import ContactModel from "../../../models/ContactModel";
import mongoose from "mongoose";
import MessageModel from "../../../models/MessageModel";

export const searchChats = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario no autenticado" });
  }

  const { organizationId } = req.user;
  const { query } = req.query;

  if (!query) {
    return res
      .status(400)
      .json({ message: "La consulta de búsqueda no puede estar vacía" });
  }

  try {
    // Construir la expresión regular para coincidencias amplias (case-insensitive)
    const searchRegex = new RegExp(query as string, "i");

    // Buscar en mensajes de entrada
    const messagesMatches = await MessageModel.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(organizationId),
          $or: [
            { from: { $regex: searchRegex } },
            { to: { $regex: searchRegex } },
            { message: { $regex: searchRegex } },
          ],
        },
      },
      {
        $group: {
          _id: "$from",
          lastMessage: { $last: "$message" },
          lastMessageTime: { $last: "$timestamp" },
        },
      },
    ]);

    const results = await Promise.all(
      messagesMatches.map(async (match) => {
        const contactInfo = await ContactModel.findOne({
          organizationId,
          $or: [
            { "properties.key": "phone", "properties.value": match._id },
            { "properties.key": "cellphone", "properties.value": match._id },
          ],
        })
          .lean()
          .exec();

        const firstNameProperty = contactInfo?.properties.find(
          (prop) => prop.key === "firstName"
        );
        const lastNameProperty = contactInfo?.properties.find(
          (prop) => prop.key === "lastName"
        );
        const name =
          `${firstNameProperty?.value || ""} ${lastNameProperty?.value || ""}`.trim();

        return {
          _id: match._id,
          contact: match._id,
          name: name || match._id,
          lastMessage: match.lastMessage,
          lastMessageTime: match.lastMessageTime,
        };
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error("Error en la búsqueda de chats:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};
