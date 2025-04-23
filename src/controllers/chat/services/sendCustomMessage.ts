import { Request, Response } from "express";
import axios from "axios";
import UserModel from "../../../models/UserModel";
import OrganizationModel from "../../../models/OrganizationModel";
import MessageModel from "../../../models/MessageModel"; // Importar el MessageModel unificado
import { getSocketInstance } from "../../../config/socket";

const apiUrl = process.env.WHATSAPP_API_URL;

export const sendCustomMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  console.log("sendCustomMessage");
  const { to, message, messageType, mediaUrl, caption } = req.body;

  if (!to || !messageType || (messageType === "text" && !message)) {
    console.error("Missing required parameters");
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    if (!req.user) {
      console.error("User not found");
      return res.status(400).json({ error: "User not found" });
    }
    const user = await UserModel.findById(req.user._id);

    if (!user) {
      console.error("User not found");
      return res.status(400).json({ error: "User not found" });
    }

    const organization = await OrganizationModel.findOne({
      employees: user._id,
    });

    if (!organization) {
      console.error("Organization not found");
      return res.status(400).json({ error: "Organization not found" });
    }

    const token = req.headers.authorization;

    if (!token) {
      console.error("Authorization token missing");
      return res.status(401).json({ error: "Authorization token missing" });
    }

    const { accessToken, numberIdIdentifier } = organization.settings.whatsapp;
    const whatsappApiUrl = `${apiUrl}/${numberIdIdentifier}/messages`;

    let payload;

    // Switch para definir el tipo de mensaje
    switch (messageType) {
      case "text":
        payload = {
          messaging_product: "whatsapp",
          to,
          text: { body: message },
        };
        break;

      case "image":
        if (!mediaUrl) {
          return res
            .status(400)
            .json({ error: "mediaUrl is required for image messages" });
        }
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "image",
          image: {
            link: mediaUrl,
            caption: caption || "", // Caption es opcional
          },
        };
        break;

      case "document":
        if (!mediaUrl) {
          return res
            .status(400)
            .json({ error: "mediaUrl is required for document messages" });
        }
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "document",
          document: {
            link: mediaUrl,
            caption: caption || "", // Caption es opcional
          },
        };
        break;

      case "video":
        if (!mediaUrl) {
          return res
            .status(400)
            .json({ error: "mediaUrl is required for video messages" });
        }
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "video",
          video: {
            link: mediaUrl,
            caption: caption || "", // Caption es opcional
          },
        };
        break;

      case "audio":
        if (!mediaUrl) {
          return res
            .status(400)
            .json({ error: "mediaUrl is required for audio messages" });
        }
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "audio",
          audio: {
            link: mediaUrl,
          },
        };
        break;

      default:
        return res.status(400).json({ error: "Unsupported message type" });
    }

    const response = await axios.post(whatsappApiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const messageId = response.data.messages[0]?.id;

    if (response.status === 200 || response.status === 201) {
      // Crear y almacenar el mensaje usando el nuevo MessageModel
      const outgoingMessage = await MessageModel.create({
        user: user._id,
        organization: organization._id,
        from: organization.settings.whatsapp.phoneNumber, // Usar el número del usuario o de la organización
        to,
        message: messageType === "text" ? message : mediaUrl,
        direction: "outgoing",
        type: messageType,
        mediaUrl: mediaUrl || "",
        timestamp: new Date().toISOString(),
        messageId: messageId,
      });

      const io = getSocketInstance();
      io.emit("newMessage", {
        ...outgoingMessage.toObject(),
        direction: "outgoing",
      });

      return res.status(200).json(outgoingMessage);
    } else {
      console.error("Error response from WhatsApp API:", response.data);
      return res.status(500).json({ error: "Error sending message" });
    }
  } catch (error: any) {
    console.log(error.message);
    console.error("Error sending message:");
    return res.status(500).json({ error: "Error sending message" });
  }
};
