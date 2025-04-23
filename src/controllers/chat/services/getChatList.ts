import { Request, Response } from "express";
import MessageModel from "../../../models/MessageModel";
import OrganizationModel from "../../../models/OrganizationModel";
import ContactModel from "../../../models/ContactModel";
import { Types } from "mongoose";

/**
 * Enriquecer la lista de chats con información del contacto
 * @param chatList - Lista de chats obtenida desde la base de datos
 * @param organizationId - ID de la organización del usuario autenticado
 * @returns Lista de chats con información enriquecida
 */
const enrichChatList = async (chatList: any[], organizationId: string) => {
  return Promise.all(
    chatList.map(async (chat) => {
      try {
        const contactInfo = await ContactModel.findOne({
          organizationId,
          $or: [
            { "properties.key": "phone", "properties.value": chat._id },
            { "properties.key": "mobile", "properties.value": chat._id },
          ],
        }).lean();

        const name = [
          contactInfo?.properties.find((prop) => prop.key === "firstName")
            ?.value,
          contactInfo?.properties.find((prop) => prop.key === "lastName")
            ?.value,
        ]
          .filter(Boolean)
          .join(" ");

        return {
          _id: chat.lastMessage?._id,
          contact: chat._id,
          name: name || chat._id,
          contactId: contactInfo?._id,
          lastMessage: chat.lastMessage?.message,
          lastMessageTime: chat.lastMessage?.timestamp
            ? new Date(chat.lastMessage.timestamp).getTime()
            : 0,
          unreadCount: chat.unreadCount,
          possibleName: chat.lastMessage?.possibleName,
        };
      } catch (error) {
        console.error(
          `Error obteniendo información del contacto ${chat._id}:`,
          error
        );
        return null;
      }
    })
  );
};

/**
 * Obtiene la lista de chats de la organización
 * @param req - Request de Express
 * @param res - Response de Express
 */
export const getChatList = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario no autenticado" });
  }

  const { search, limit = "10", page = "1" } = req.query;
  const searchQuery = search as string;
  const organizationId = req.user.organizationId;

  try {
    // Si hay un término de búsqueda, ejecutar búsqueda y devolver resultados

    // Convertir y validar los parámetros de paginación
    const limitNum = Math.max(parseInt(limit as string, 10), 1);
    const pageNum = Math.max(parseInt(page as string, 10), 1);
    const offset = (pageNum - 1) * limitNum;

    // Obtener el número de WhatsApp de la organización
    const organization = await OrganizationModel.findById(organizationId)
      .lean()
      .exec();

    if (!organization?.settings?.whatsapp?.phoneNumber) {
      return res.status(400).json({
        message: "Número de WhatsApp de la organización no encontrado",
      });
    }

    const userPhoneNumber = organization.settings.whatsapp.phoneNumber;

    const chatList = await MessageModel.aggregate([
      {
        $match: {
          organization: new Types.ObjectId(organizationId),
          $or: [
            {
              from: searchQuery
                ? { $regex: searchQuery, $options: "i" }
                : userPhoneNumber,
            },
            {
              to: searchQuery
                ? { $regex: searchQuery, $options: "i" }
                : userPhoneNumber,
            },
          ],
        },
      },
      {
        $addFields: {
          contact: {
            $cond: {
              if: { $eq: ["$from", userPhoneNumber] },
              then: "$to",
              else: "$from",
            },
          },
        },
      },
      {
        $group: {
          _id: "$contact",
          lastMessage: { $last: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$to", userPhoneNumber] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.timestamp": -1 } },
      { $skip: offset },
      { $limit: limitNum },
    ]);

    // Enriquecer la lista de chats con información del contacto
    const enrichedChatList = await enrichChatList(chatList, organizationId);

    if (!enrichedChatList) {
      return res.status(404).json({ message: "No se encontraron chats" });
    }

    return res.status(200).json(enrichedChatList.filter(Boolean));
  } catch (error) {
    console.error("Error obteniendo la lista de chats:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};
