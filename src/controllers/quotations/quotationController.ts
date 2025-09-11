import { Request, Response } from "express";
import { IApiAuthRequest } from "../../types/apiTypes";
import Quotation from "../../models/QuotationModel";
import OrganizationModel from "../../models/OrganizationModel";
import {
  generateQuotationPdf,
  getPdfAsBase64,
  getQuotationPdfFilename,
} from "../../services/quotation/printQuotationService";
import IntegrationsModel from "../../models/IntegrationsModel";
import ContactModel from "../../models/ContactModel";

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

// Get next quotation number (atomic operation)
export const getNextQuotationNumber = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        message: "ID de organización no proporcionado",
        code: "ORGANIZATION_ID_REQUIRED",
      });
    }

    // Usar findOneAndUpdate con $inc para operación atómica
    const organization = await OrganizationModel.findOneAndUpdate(
      { _id: organizationId },
      { $inc: { "settings.quotations.quotationNumber": 1 } },
      {
        new: true, // Retornar el documento actualizado
        upsert: false, // No crear si no existe
      }
    );

    if (!organization) {
      return res.status(404).json({
        message: "Organización no encontrada",
        code: "ORGANIZATION_NOT_FOUND",
      });
    }

    // El número actual ya está incrementado
    const nextQuotationNumber =
      organization.settings.quotations.quotationNumber;

    res.status(200).json({
      quotationNumber: nextQuotationNumber,
      message: "Número de cotización generado exitosamente",
    });
  } catch (error) {
    console.error("Error generando número de cotización:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Create a new quotation
export const createQuotation = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;

  try {
    // search for quotation number
    const quotationNumber = await Quotation.findOne({
      organizationId,
      quotationNumber: req.body.quotationNumber,
    });

    if (quotationNumber) {
      return res
        .status(400)
        .json({ message: "Quotation number already exists" });
    }

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

    // Note: El número de cotización ya fue incrementado cuando se obtuvo vía /next-quotation-number

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

export const createQuotationApi = async (
  req: IApiAuthRequest,
  res: Response
) => {
  try {
    /*
      Objetivo: Crear una cotización en la base de datos desde la API. 

      Importante:
      1. Validar el contacto este creado o crearlo. 
      2. Inferir el numero de cotización desde la organización.
      3. El organizationId se obtiene del token de API autenticado.
      4. El body recibe un array con formato específico de cliente y cotización.
    */

    // Obtener organizationId y userId del token de API
    const organizationId = req.apiUser?.organizationId;
    const userId = req.apiUser?._id;

    if (!organizationId || !userId) {
      return res.status(401).json({
        message: "Token de API no válido",
        code: "INVALID_API_TOKEN",
      });
    }

    console.log(req.body);

    // Validar que el body sea un objeto válido
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        message: "El body debe ser un objeto JSON válido",
        code: "INVALID_BODY_FORMAT",
      });
    }

    const quotationData = req.body; // El body ya es el objeto de cotización

    const { Cliente, cotizacion, totals } = quotationData;

    // Validar datos requeridos
    if (!Cliente || !cotizacion || !totals) {
      return res.status(400).json({
        message:
          "Faltan datos requeridos: Cliente, cotizacion y totals son obligatorios",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    if (!Cliente.Mobile || !Cliente.Nombre) {
      return res.status(400).json({
        message: "El cliente debe tener Mobile y Nombre",
        code: "INVALID_CLIENT_DATA",
      });
    }

    if (!Array.isArray(cotizacion) || cotizacion.length === 0) {
      return res.status(400).json({
        message: "La cotización debe tener al menos un item",
        code: "EMPTY_QUOTATION_ITEMS",
      });
    }

    // Obtener la organización y el número de cotización
    const organization = await OrganizationModel.findOne({
      _id: organizationId,
    });

    if (!organization) {
      return res.status(400).json({
        message: "Organización no encontrada",
        code: "ORGANIZATION_NOT_FOUND",
      });
    }

    // Obtener e incrementar el número de cotización de forma atómica
    const updatedOrganization = await OrganizationModel.findOneAndUpdate(
      { _id: organizationId },
      { $inc: { "settings.quotations.quotationNumber": 1 } },
      { new: true, upsert: false }
    );

    if (!updatedOrganization) {
      return res.status(404).json({
        message: "Organización no encontrada durante la actualización",
        code: "ORGANIZATION_UPDATE_FAILED",
      });
    }

    const currentQuotationNumber =
      updatedOrganization.settings.quotations.quotationNumber;

    try {
      // Validar si el contacto existe, si no, crearlo
      let contactId;
      const contactExists = await ContactModel.findOne({
        "properties.key": "mobile",
        "properties.value": Cliente.Mobile,
        organizationId,
      });

      if (contactExists) {
        contactId = contactExists._id;

        // Actualizar datos del contacto si han cambiado
        const firstNameProp = contactExists.properties.find(
          (p) => p.key === "firstName"
        );
        const lastNameProp = contactExists.properties.find(
          (p) => p.key === "lastName"
        );
        const mobileProp = contactExists.properties.find(
          (p) => p.key === "mobile"
        );
        const idNumberProp = contactExists.properties.find(
          (p) => p.key === "idNumber"
        );

        const needsUpdate =
          (firstNameProp && firstNameProp.value !== Cliente.Nombre) ||
          (mobileProp && mobileProp.value !== Cliente.Mobile) ||
          (idNumberProp && idNumberProp.value !== Cliente.Nit);

        if (needsUpdate) {
          // Actualizar properties específicas
          const updateData: any = {};

          if (firstNameProp && firstNameProp.value !== Cliente.Nombre) {
            updateData["properties.$.value"] = Cliente.Nombre;
            await ContactModel.updateOne(
              { _id: contactExists._id, "properties.key": "firstName" },
              { $set: updateData }
            );
          }

          if (mobileProp && mobileProp.value !== Cliente.Mobile) {
            await ContactModel.updateOne(
              { _id: contactExists._id, "properties.key": "mobile" },
              { $set: { "properties.$.value": Cliente.Mobile } }
            );
          }

          if (
            Cliente.Nit &&
            idNumberProp &&
            idNumberProp.value !== Cliente.Nit
          ) {
            await ContactModel.updateOne(
              { _id: contactExists._id, "properties.key": "idNumber" },
              { $set: { "properties.$.value": Cliente.Nit } }
            );
          }
        }
      } else {
        // Crear el contacto con properties
        const properties = [
          { value: Cliente.Nombre || "", key: "firstName", isVisible: true },
          { value: "", key: "lastName", isVisible: true },
          { value: "", key: "position", isVisible: false },
          { value: "", key: "email", isVisible: false },
          { value: "", key: "phone", isVisible: true },
          { value: Cliente.Mobile, key: "mobile", isVisible: true },
          { value: "", key: "address", isVisible: false },
          { value: "", key: "city", isVisible: false },
          { value: "", key: "country", isVisible: false },
          { value: "", key: "comments", isVisible: false },
          { value: "NIT", key: "idType", isVisible: false },
          { value: Cliente.Nit || "", key: "idNumber", isVisible: false },
        ];

        const newContact = await ContactModel.create({
          organizationId,
          properties,
        });
        contactId = newContact._id;
      }

      // Transformar los items de cotización al formato esperado por el modelo
      const items = cotizacion.map((item: any) => ({
        name: item.producto,
        description: item.descripcion,
        quantity: item.cantidad,
        unitPrice: item.precio,
        taxes: item.iva,
        total: item.total,
        imageUrl: item.imageUrl || item.imagen || "", // Soporte para imageUrl o imagen
      }));

      // Crear la cotización
      const newQuotation = await Quotation.create({
        contactId,
        quotationNumber: Number(currentQuotationNumber),
        items,
        optionalItems: [], // Inicializar array vacío
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
        lastModified: new Date(),
        name: `${currentQuotationNumber} - ${Cliente.Nombre}`, // Formato consistente con el ejemplo
        observaciones: `Forma de pago: ${totals.forma_De_Pago}. Tiempo de entrega: ${totals.tiempo_de_entrega}`,
        paymentTerms: totals.forma_De_Pago,
        shippingTerms: totals.tiempo_de_entrega,
        status: "draft",
        subtotal: totals.subtotal,
        taxes: totals.iva,
        discounts: 0, // Por defecto sin descuentos
        total: totals.total,
        userId,
        organizationId,
      });

      // Obtener la cotización creada con el contacto poblado
      const quotation = await Quotation.findById(newQuotation._id).populate(
        "contactId"
      );

      res.status(201).json({
        message: "Cotización creada exitosamente",
        data: quotation,
        quotationNumber: currentQuotationNumber,
      });
    } catch (creationError) {
      // Si hay error en la creación, revertir el incremento del número de cotización
      await OrganizationModel.findOneAndUpdate(
        { _id: organizationId },
        { $inc: { "settings.quotations.quotationNumber": -1 } }
      );

      // Re-lanzar el error para que sea capturado por el catch principal
      throw creationError;
    }
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
