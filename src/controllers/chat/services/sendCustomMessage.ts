import { Request, Response } from "express";
import axios, { AxiosError } from "axios";
import UserModel from "../../../models/UserModel";
import OrganizationModel from "../../../models/OrganizationModel";
import MessageModel from "../../../models/MessageModel"; // Importar el MessageModel unificado
import { getSocketInstance } from "../../../config/socket";
import IntegrationsModel from "../../../models/IntegrationsModel";
import ConversationModel from "../../../models/ConversationModel";
import { createConversation } from "../../../services/conversations/createConversation";
import ConversationPipelineModel from "../../../models/ConversationPipelineModel";

const apiUrl = process.env.WHATSAPP_API_URL;

export const sendCustomMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
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

    const integration = await IntegrationsModel.findOne({
      organizationId: organization._id,
      service: "whatsapp",
    });

    if (!integration) {
      console.error("Integration not found");
      return res.status(400).json({ error: "Integration not found" });
    }

    const { accessToken, numberIdIdentifier } = integration.credentials;
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

    let response;
    try {
      // Llamada a la API de WhatsApp con manejo de errores específico
      response = await axios.post(whatsappApiUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (axiosError: any) {
      // Procesamiento detallado del error de la API
      const errorResponse = axiosError.response;
      if (errorResponse && errorResponse.data) {
        console.error("WhatsApp API Error:", errorResponse.data);

        // Extraer mensaje de error específico si está disponible
        let errorMessage = "Error al enviar mensaje a WhatsApp";
        let errorDetails = {};

        if (errorResponse.data.error) {
          if (typeof errorResponse.data.error === "string") {
            errorMessage = errorResponse.data.error;
          } else if (errorResponse.data.error.message) {
            errorMessage = errorResponse.data.error.message;
            errorDetails = {
              code: errorResponse.data.error.code || "",
              type: errorResponse.data.error.type || "",
              subcode: errorResponse.data.error.error_subcode || "",
            };
          }
        }

        return res.status(errorResponse.status || 500).json({
          error: errorMessage,
          details: errorDetails,
          payload: payload, // Devolver el payload para depuración
          statusCode: errorResponse.status,
        });
      }

      // Error genérico si no hay respuesta estructurada
      console.error("Error calling WhatsApp API:", axiosError.message);
      return res.status(500).json({
        error: "Error al conectar con la API de WhatsApp",
        message: axiosError.message,
        payload: payload,
      });
    }

    const messageId = response.data.messages[0]?.id;

    let conversation = await ConversationModel.findOne({
      organization: organization._id,
      "participants.contact.reference": to, // Buscar por la referencia del contacto
    });

    if (!conversation) {
      // Crear una nueva conversación
      // conversation = await ConversationModel.create({
      //   title: `Conversación con ${to}`,
      //   organization: organization._id,
      //   participants: {
      //     user: {
      //       type: "User",
      //       reference: user._id,
      //     },
      //     contact: {
      //       type: "Contact",
      //       reference: to,
      //     },
      //   },
      //   pipeline: "6814ef02e3de1af46109d105", // pipeline id por defecto
      //   currentStage: 0,
      //   assignedTo: user._id,
      //   priority: "medium",
      //   firstContactTimestamp: new Date(),
      // });

      const conversationPipeline: any = await ConversationPipelineModel.findOne(
        {
          organization: organization._id,
        }
      );

      if (!conversationPipeline) {
        return res.status(500).json({
          error: "Error al crear la conversación",
        });
      }

      const newConversation = await createConversation({
        organizationId: organization._id,
        userId: user._id.toString(),
        to,
        pipelineId: conversationPipeline._id,
        assignedTo: user._id.toString(),
      });

      if (!newConversation) {
        return res.status(500).json({
          error: "Error al crear la conversación",
        });
      }

      conversation = newConversation;
    }

    if (response.status === 200 || response.status === 201) {
      // Crear y almacenar el mensaje usando el nuevo MessageModel
      const outgoingMessage = await MessageModel.create({
        user: user._id,
        organization: organization._id,
        from: integration.credentials.phoneNumber || "",
        to,
        message: messageType === "text" ? message : mediaUrl,
        direction: "outgoing",
        type: messageType,
        mediaUrl: mediaUrl || "",
        timestamp: new Date().toISOString(),
        messageId: messageId,
        conversation: conversation?._id,
      });

      const io = getSocketInstance();
      io.emit("newMessage", {
        ...outgoingMessage.toObject(),
        direction: "outgoing",
      });

      return res.status(200).json(outgoingMessage);
    } else {
      console.error("Error response from WhatsApp API:", response.data);
      return res
        .status(500)
        .json({ error: "Error sending message", details: response.data });
    }
  } catch (error: any) {
    console.log(error.message);
    console.error("Error en el procesamiento del mensaje:", error);
    return res.status(500).json({
      error: "Error en el procesamiento del mensaje",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
