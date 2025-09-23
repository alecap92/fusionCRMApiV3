import { Request, Response } from "express";
import ConversationModel from "../../models/ConversationModel";
import Message from "../../models/MessageModel";
import ContactModel from "../../models/ContactModel";

export const findConversationByPhone = async (req: Request, res: Response) => {
  const { mobile } = req.query;
  const organizationId = req.user?.organizationId;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      message: "El parámetro mobile es requerido",
    });
  }

  try {
    // Buscar conversación por número de teléfono
    const conversation = await ConversationModel.findOne({
      "participants.contact.reference": mobile,
      organization: organizationId,
    })
      .populate("assignedTo", "name email profilePicture")
      .populate("pipeline")
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "No se encontró conversación para este número",
      });
    }

    // Obtener el último mensaje real usando agregación
    const lastMessageAgg = await Message.aggregate([
      { $match: { conversation: conversation._id } },
      { $sort: { timestamp: -1 } },
      { $limit: 1 },
    ]);

    const lastMessage = lastMessageAgg[0] || null;

    // Buscar información del contacto
    let contact: any = null;
    const reference = conversation?.participants?.contact?.reference;
    if (reference) {
      try {
        contact = await ContactModel.findOne({
          organizationId,
          $or: [
            {
              "properties.key": "mobile",
              "properties.value": reference,
            },
            {
              "properties.key": "phone",
              "properties.value": reference,
            },
          ],
        })
          .select("properties")
          .lean();
      } catch (error) {
        console.error("Error obteniendo el contacto:", error);
      }
    }

    // Procesar la conversación
    const conversationObj: any = { ...conversation };

    // Enriquecer con información del contacto
    if (reference) {
      const findProp = (key: string) =>
        contact?.properties?.find((p: any) => p.key === key)?.value;

      conversationObj.participants.contact.displayInfo = {
        mobile: reference,
        name: findProp("firstName") || reference,
        lastName: findProp("lastName") || "",
        email: findProp("email") || "",
        position: findProp("position") || "",
        contactId: contact?._id || null,
      };
    }

    // Asignar el último mensaje real
    conversationObj.lastMessage = lastMessage;
    conversationObj.lastMessageTimestamp =
      lastMessage?.timestamp || conversation.lastMessageTimestamp;
    conversationObj.mobile = reference;

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
