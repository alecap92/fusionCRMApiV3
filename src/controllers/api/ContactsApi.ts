import { Request, Response } from "express";
import ContactModel from "../../models/ContactModel";

export const createContact = async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId;
    const body = req.body;

    const createContact = {
      organizationId: organizationId,
      properties: [
        {
          key: "firstName",
          value: body.first_name || "",
          isVisible: true,
        },
        {
          key: "email",
          value: body.email || "",
          isVisible: true,
        },
        {
          key: "mobile",
          value: body.whatsapp_phone || "",
          isVisible: true,
        },
        {
          key: "city",
          value: body.custom_fields?.Ciudad || "",
          isVisible: true,
        },
        {
          key: "source",
          value: "API",
          isVisible: true,
        },
        {
          key: "companyName",
          value: body.custom_fields?.Empresa || "",
          isVisible: true,
        },
        {
          key: "idNumber",
          value: body.custom_fields?.Nit || "",
          isVisible: true,
        },
      ],
    };

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const contact = await ContactModel.create(createContact);
    res.status(201).json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
