import { Request, Response } from "express";
import OrganizationModel from "../../../models/OrganizationModel";
import axios from "axios";
import MessageModel from "../../../models/MessageModel";

export const sendTemplateMessage = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const organization = await OrganizationModel.findOne({
      _id: organizationId,
    });

    const body = req.body;

    if (!organization) {
      return res.status(400).json({ error: "Organization not found" });
    }

    const whatsappApiUrl = `${process.env.WHATSAPP_API_URL}/${organization.settings.whatsapp.numberIdIdentifier}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: body.to,
      type: "template",
      template: {
        name: body.template.name,
        language: body.template.language,
        components: body.template.components,
      },
    };

    const response = await axios.post(whatsappApiUrl, payload, {
      headers: {
        Authorization: `Bearer ${organization.settings.whatsapp.accessToken}`,
      },
    });

    // save msg in db
    const outGoingMessage = await MessageModel.create({
      organization: organizationId,
      from: organization.settings.whatsapp.phoneNumber,
      to: body.to,
      type: "text",
      direction: "outgoing",
      message: body.message,
      isRead: true,
      user: req.user?._id,
    });

    await outGoingMessage.save();

    res.status(200).json(response.data);
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });

      res.status(error.response?.status || 500).json({
        error: error.response?.data || "Error desconocido",
      });
    } else {
      console.error("Unexpected error:", error.message);
      res.status(500).json({
        error: "Error desconocido",
      });
    }
  }
};
