import { Request, Response } from "express";
import OrganizationModel from "../../../models/OrganizationModel";
import axios, { AxiosError } from "axios";
import MessageModel from "../../../models/MessageModel";
import IntegrationsModel from "../../../models/IntegrationsModel";
import ConversationModel from "../../../models/ConversationModel";
import ConversationPipeline from "../../../models/ConversationPipelineModel";

interface TemplateComponent {
  type: string;
  format?: string;
  text: string;
}

interface Template {
  name: string;
  parameter_format: string;
  components: TemplateComponent[];
  language: string;
  status: string;
  category: string;
  id: string;
}

export const sendTemplateMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res
        .status(400)
        .json({ error: "ID de organización no encontrado" });
    }

    const organization = await OrganizationModel.findOne({
      _id: organizationId,
    });

    if (!organization) {
      return res.status(400).json({ error: "Organización no encontrada" });
    }

    const integration = await IntegrationsModel.findOne({
      organizationId: organizationId,
      service: "whatsapp",
    });

    if (!integration) {
      return res
        .status(400)
        .json({ error: "Integración de WhatsApp no encontrada" });
    }

    if (
      !integration.credentials?.numberIdIdentifier ||
      !integration.credentials?.accessToken
    ) {
      return res
        .status(400)
        .json({ error: "Credenciales de WhatsApp incompletas" });
    }

    const { template, phoneNumber } = req.body;

    if (!template) {
      return res.status(400).json({ error: "Plantilla no encontrada" });
    }

    if (!phoneNumber) {
      return res
        .status(400)
        .json({ error: "Número de teléfono no encontrado" });
    }

    const whatsappApiUrl = `${process.env.WHATSAPP_API_URL}/${integration.credentials.numberIdIdentifier}/messages`;

    // Verificar si es una plantilla de WhatsApp oficial o una plantilla de texto simple
    let payload;
    let messageText = "";

    if (template.name && template.language && template.components) {
      // Es una plantilla oficial de WhatsApp
      payload = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: template.name,
          language: {
            code: template.language,
          },
        },
      };

      // Extraer el texto del mensaje para guardarlo en la base de datos
      messageText =
        template.components?.find(
          (comp: TemplateComponent) => comp.type === "BODY"
        )?.text ||
        template.components?.find(
          (comp: TemplateComponent) => comp.type === "HEADER"
        )?.text ||
        template.message ||
        "Template message";
    } else {
      // Es una plantilla de texto simple, enviar como mensaje de texto normal
      payload = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: template.message || template.text || "Mensaje de plantilla",
        },
      };

      messageText = template.message || template.text || "Mensaje de plantilla";
    }

    let response;
    try {
      response = await axios.post(whatsappApiUrl, payload, {
        headers: {
          Authorization: `Bearer ${integration.credentials.accessToken}`,
        },
      });
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error("Error de WhatsApp API:", error.response?.data);
        return res.status(error.response?.status || 500).json({
          error: "Error al enviar mensaje a WhatsApp",
          details: error.response?.data,
        });
      }
      throw error;
    }

    const conversation = await ConversationModel.findOne({
      organization: organizationId,
      "participants.contact.reference": phoneNumber,
    });

    let conversationId;
    if (!conversation) {
      try {
        // Obtener el pipeline predeterminado dinámicamente
        const defaultPipeline = await ConversationPipeline.findOne({
          organization: organizationId,
          isDefault: true,
        });

        if (!defaultPipeline) {
          return res.status(400).json({
            error:
              "No se encontró un pipeline predeterminado para la organización",
          });
        }

        const newConversation = new ConversationModel({
          organization: organizationId,
          title: phoneNumber,
          participants: {
            user: {
              type: "User",
              reference: req.user._id,
            },
            contact: {
              type: "Contact",
              reference: phoneNumber,
            },
          },
          unreadCount: 0,
          isResolved: false,
          priority: "low",
          tags: [],
          firstContactTimestamp: new Date(),
          metadata: [
            {
              key: "origen",
              value: "whatsapp",
            },
          ],
          isArchived: false,
          pipeline: defaultPipeline._id,
          assignedTo: req.user._id,
        });
        await newConversation.save();
        conversationId = newConversation._id;
      } catch (error) {
        console.error("Error al crear la conversación:", error);
        return res
          .status(500)
          .json({ error: "Error al crear la conversación" });
      }
    } else {
      conversationId = conversation._id;
    }

    console.log(template, "template");

    try {
      const outGoingMessage = await MessageModel.create({
        organization: organizationId,
        from: integration.credentials.phoneNumber,
        to: phoneNumber,
        type: "text",
        direction: "outgoing",
        message: messageText,
        isRead: true,
        user: req.user._id,
        conversation: conversationId,
        messageId: response.data?.messages?.[0]?.id,
      });

      await outGoingMessage.save();

      // Resetear contador de no leídos cuando se envía un mensaje saliente
      await ConversationModel.findByIdAndUpdate(conversationId, {
        unreadCount: 0,
      });

      return res.status(200).json({
        message: "Mensaje de plantilla enviado exitosamente",
        conversationId,
        messageId: outGoingMessage._id,
      });
    } catch (error) {
      console.error("Error al guardar el mensaje:", error);
      return res.status(500).json({ error: "Error al guardar el mensaje" });
    }
  } catch (error: any) {
    console.error("Error en sendTemplateMessage:", error);
    return res.status(500).json({
      error: "Error interno del servidor",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
