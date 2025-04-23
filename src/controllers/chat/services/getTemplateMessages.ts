import { Request, Response } from "express";
import axios from "axios";
import Organization from "../../../models/OrganizationModel";

interface TemplateComponent {
  type: string;
  format?: string;
  text: string;
}

interface Template {
  name: string;
  components: TemplateComponent[];
  language: string;
  status: string;
  category: string;
  id: string;
}

export const getTemplatesMessages = async (
  req: Request,
  res: Response
): Promise<Template[] | undefined> => {
  if (!req.user) {
    res.status(401).json({ message: "Usuario no autenticado" });
    return;
  }

  const { organizationId } = req.user;

  const organization = await Organization.findById(organizationId);

  try {
    const response = await axios.get(
      `${process.env.WHATSAPP_API_URL}/${organization?.settings.whatsapp.whatsAppBusinessAccountID}/message_templates`,
      {
        headers: {
          Authorization: `Bearer ${organization?.settings.whatsapp.accessToken}`,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error: any) {
    console.log(error);
    console.error("Error obteniendo las plantillas:", error.message);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Error desconocido",
    });
    return undefined;
  }
};
