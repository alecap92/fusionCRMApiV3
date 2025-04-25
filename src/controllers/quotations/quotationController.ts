import { Request, Response } from "express";
import Quotation from "../../models/QuotationModel";
import OrganizationModel from "../../models/OrganizationModel";
import {
  generateQuotationPdf,
  getPdfAsBase64,
  getQuotationPdfFilename,
} from "../../services/quotation/printQuotationService";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import ContactModel from "../../models/ContactModel";
import IntegrationsModel from "../../models/IntegrationsModel";

// Get a single quotation by ID
export const getQuotation = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    const quotation = await Quotation.findById({
      _id: req.params.id,
      organizationId,
    })
      .populate("contactId")
      .populate("organizationId")
      .populate("userId");
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all quotations
export const getQuotations = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const quotations = await Quotation.find({ organizationId })
      .sort({ creationDate: -1, quotationNumber: -1 })
      .populate("contactId")
      .populate("organizationId")
      .populate("userId")
      .skip(skip)
      .limit(limit)
      .exec();

    const totalQuotations = await Quotation.countDocuments({ organizationId });

    const parsedContacts = quotations.map((quotation: any) => {
      const contact = quotation.contactId as any;
      if (!contact) return quotation;

      const firstName =
        contact.properties.find((p: any) => p.key === "firstName")?.value || "";
      const lastName =
        contact.properties.find((p: any) => p.key === "lastName")?.value || "";
      const email =
        contact.properties.find((p: any) => p.key === "email")?.value || "";
      const mobile =
        contact.properties.find((p: any) => p.key === "mobile")?.value || "";

      return {
        ...quotation.toJSON(),
        contactId: {
          firstName,
          lastName,
          email,
          mobile,
        },
      };
    });

    res.json({
      quotations: parsedContacts,
      totalPages: Math.ceil(totalQuotations / limit),
      currentPage: page,
      totalQuotations,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Search for quotations based on a term
export const searchQuotation = async (req: Request, res: Response) => {
  try {
    const { term } = req.query;
    const organizationId = req.user?.organizationId;

    if (!term) {
      return res.status(400).json({ message: "Term is required" });
    }

    const query = {
      $or: [{ contactId: term }, { name: { $regex: term, $options: "i" } }],
      organizationId,
    };

    const quotations = await Quotation.find(query)
      .populate("contactId")
      .sort({ creationDate: -1 });

    if (!quotations) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // Parse the contactId to get the firstName and lastName
    const parsedContacts = quotations.map((quotation: any) => {
      const contact = quotation.contactId as any;
      if (!contact) return quotation;
      const firstName =
        contact.properties.find((p: any) => p.key === "firstName")?.value || "";
      const lastName =
        contact.properties.find((p: any) => p.key === "lastName")?.value || "";
      const email =
        contact.properties.find((p: any) => p.key === "email")?.value || "";
      const mobile =
        contact.properties.find((p: any) => p.key === "mobile")?.value || "";
      return {
        ...quotation.toJSON(),
        contactId: {
          firstName,
          lastName,
          email,
          mobile,
          id: contact._id,
        },
      };
    });

    res.status(200).json({
      quotations: parsedContacts,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new quotation
export const createQuotation = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;

  try {
    const formatedQuotation = {
      items: req.body.items,
      contactId: req.body.contact.id,
      expirationDate: req.body.expirationDate,
      lastModified: req.body.lastModified,
      name: req.body.name,
      observaciones: req.body.observaciones,
      optionalItems: [],
      paymentTerms: req.body.paymentTerms,
      quotationNumber: req.body.quotationNumber,
      shippingTerms: req.body.shippingTerms,
      status: req.body.status,
      subtotal: req.body.subtotal,
      taxes: req.body.taxes,
      total: req.body.total,
      userId,
      organizationId,
    };

    const newQuotation = new Quotation(formatedQuotation);
    await newQuotation.save();

    if (newQuotation) {
      // increase quotation count
      const number = await OrganizationModel.findByIdAndUpdate(organizationId, {
        $inc: { "settings.quotations.quotationNumber": 1 },
      });
    }

    res.status(201).json(newQuotation);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", err });
  }
};

// Update a quotation by ID
export const updateQuotation = async (req: Request, res: Response) => {
  try {
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json(updatedQuotation);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a quotation by ID
export const deleteQuotation = async (req: Request, res: Response) => {
  try {
    const deletedQuotation = await Quotation.findByIdAndDelete(req.params.id);
    if (!deletedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json({ message: "Quotation deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Advanced filter for quotations
export const advancedFilterQuotations = async (req: Request, res: Response) => {
  try {
    const filters = req.body;
    const quotations = await Quotation.find(filters);
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const printQuotation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res
        .status(400)
        .json({ message: "ID de organización no proporcionado" });
    }

    // Utilizar el servicio para generar el PDF
    const { pdfBuffer } = await generateQuotationPdf(
      id,
      organizationId.toString()
    );

    // Enviar el PDF como respuesta
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${getQuotationPdfFilename(id)}`
    );
    res.status(200).end(pdfBuffer);
  } catch (error) {
    console.error("Error generando la cotización en PDF:", error);
    res.status(500).json({
      message: "Error generando la cotización en PDF",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

export const sendQuotationEmail = async (req: Request, res: Response) => {
  try {
    const { quotationNumber, to, from, subject, message, templateId } =
      req.body;
    const organizationId = req.user?.organizationId;

    const emailConfig = await IntegrationsModel.findOne({
      organizationId,
      service: "brevo",
    });

    if (!emailConfig) {
      return res.status(400).json({ message: "Email configuration not found" });
    }

    const config = emailConfig.credentials;

    const apiKey = config.apiKey;

    if (!quotationNumber || !to || !subject || !organizationId) {
      return res
        .status(400)
        .json({ message: "Faltan datos requeridos para enviar el correo" });
    }

    // Utilizar el servicio para generar el PDF
    const { pdfBuffer } = await generateQuotationPdf(
      quotationNumber,
      organizationId.toString()
    );

    // Convertir el PDF a base64
    const pdfBase64 = getPdfAsBase64(pdfBuffer);

    // Importar el servicio de Brevo
    const {
      sendEmailWithBrevo,
    } = require("../../services/email/brevoEmailService");

    // Definir la interfaz EmailParams para usar en emailParams
    interface EmailParams {
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
      from: string;
      attachments?: {
        content: string;
        name: string;
        contentType: string;
      }[];
      organizationId: string;
      api_key: string;
      templateId?: string;
    }

    // Crear el HTML para el cuerpo del correo (solo se usará si no hay templateId)
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Cotización #${quotationNumber}</h2>
        <p>${message || "Adjunto encontrará la cotización solicitada."}</p>
        <p>Saludos cordiales,<br>Equipo de ventas</p>
      </div>
    `;

    // Configurar los parámetros para el servicio de email
    const emailParams: EmailParams = {
      to: to,
      subject: subject,
      html: emailHtml,
      from: from,
      attachments: [
        {
          content: pdfBase64,
          name: getQuotationPdfFilename(quotationNumber),
          contentType: "application/pdf",
        },
      ],
      organizationId: organizationId.toString(),
      api_key: apiKey || "",
    };

    // Si hay templateId, añadirlo a los parámetros
    if (templateId) {
      emailParams.templateId = templateId;
    }

    // Enviar el correo con Brevo
    await sendEmailWithBrevo(emailParams);

    res.status(200).json({ message: "Cotización enviada correctamente" });
  } catch (error) {
    console.error("Error al enviar cotización por correo:", error);
    res.status(500).json({
      message: "Error enviando el correo de la cotización",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};
