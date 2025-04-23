import { Request, Response } from "express";
import Invoice from "../../models/InvoiceModel";
import mongoose from "mongoose";
import { createInvoiceInApi, downloadPdfInvoice, downloadXmlInvoice, getInvoicesFromApi } from "../../services/invoice/invoiceService";
import InvoiceConfiguration from "../../models/InvoiceConfiguration";
import JSZip from "jszip";
import { sendEmailWithBrevo } from "../../services/email/brevoEmailService";
import IntegrationsModel from "../../models/IntegrationsModel";


// Create Invoice


export const createInvoice = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const invoice = req.body;
    console.log(invoice, "invoice");
    const response = await createInvoiceInApi(invoice, organizationId as any);
    console.log(response, "response");

    // update next invoice number
    await InvoiceConfiguration.findOneAndUpdate(
      { organizationId },
      { $set: { nextInvoiceNumber: (Number(invoice.number)+1).toString() } }
    );


    res.status(200).json(response);
  } catch (error) {
    console.error("Error creating invoice:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all Invoices
export const getInvoices = async (req: Request, res: Response) => {
  try {

    const organizationId = req.user?.organizationId;

    const invoices = await getInvoicesFromApi(organizationId as any);

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ message: "No invoices found" });
    }


    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error getting invoices:", error);
    res.status(500).json({ message: "Error getting invoices", error });
  }
};

// Read Invoice (your existing getInvoice function)
export const getInvoice = async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      userId,
      organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json(invoice);
  } catch (error) {
    console.error("Error getting invoice:", error);
    res.status(500).json({ message: "Error getting invoice", error });
  }
};

// Update Invoice
export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    const updatedInvoice = await Invoice.findOneAndUpdate(
      { _id: invoiceId, userId, organizationId },
      req.body,
      { new: true }
    );

    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json(updatedInvoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ message: "Error updating invoice", error });
  }
};

// Delete Invoice
export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    const deletedInvoice = await Invoice.findOneAndDelete({
      _id: invoiceId,
      userId,
      organizationId,
    });

    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ message: "Error deleting invoice", error });
  }
};

// Search/List Invoices with filters
export const searchInvoice = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = -1,
      search = "",
      startDate,
      endDate,
      status,
    } = req.query;

    const query: any = {
      userId,
      organizationId,
    };

    // Add search conditions
    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(String(search), "i") },
        { customerName: new RegExp(String(search), "i") },
      ];
    }

    // Add date range filter
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(String(startDate)),
        $lte: new Date(String(endDate)),
      };
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { [String(sortBy)]: Number(sortOrder) },
    };

    // const invoices = await Invoice.paginate(query, options);
    res.status(200).json("invoices");
  } catch (error) {
    console.error("Error searching invoices:", error);
    res.status(500).json({ message: "Error searching invoices", error });
  }
};

// Send Invoice
export const sendInvoice = async (req: Request, res: Response) => {
  try {

    
    const organizationId = req.user?.organizationId; 

    const invoice = req.body;

    const { to, subject, text } = req.body;


    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    // obtener info sobre el servicio como: from, apikey

    const emailConfig = await IntegrationsModel.findOne({
      organizationId,
      service: "brevo"
    });



    if (!emailConfig) {
      return res.status(400).json({ message: "Email configuration not found" });
    } 

    const config = emailConfig.credentials;

    const from = config.from;
    const apiKey = config.apiKey;

    if(!invoice.number && !invoice.prefix){
      return res.status(400).json({ message: "Invoice number and prefix are required" });
    }

    if(!invoice.subject && !invoice.to){
      return res.status(400).json({ message: "Invoice subject and to are required" });
    }


    console.log(invoice, "invoice");
    if(!invoice.content && !invoice.html){
      return res.status(400).json({ message: "Invoice message content or html are required" });
    }

    const xmlInvoice = await downloadXmlInvoice(invoice, organizationId as any);
    const pdfInvoice = await downloadPdfInvoice(invoice, organizationId as any);


    // compress data into a zip file

    const zip = new JSZip();
    zip.file("invoice.xml", xmlInvoice);
    zip.file("invoice.pdf", pdfInvoice);
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    
    
    const zipBase64 = zipBuffer.toString("base64");

    // Construct the email and send it
    const attachments = [
      {
        content: zipBase64,
        name: `FES-${invoice.prefix}${invoice.number}.zip`, 
        contentType: "application/zip"
      }
    ];

    // Para debug, devolver solo una parte del base64
    const debugResponse = {
      attachmentSize: zipBase64.length,
      attachmentPreview: zipBase64.substring(0, 100) + "...",
      to,
      subject,
      from
    };

    // Send the email - comentado para debug
    console.log("Enviando email con Brevo...");


    await sendEmailWithBrevo({
      to: to,
      subject: subject || "Sin Asunto",
      text: invoice.content || text || "Sin texto.",
      html: invoice.html || "",
      from: from,
      attachments,
      organizationId,
      api_key: apiKey
    });
    console.log("Email enviado correctamente");
    
    console.log("Proceso completado, devolviendo respuesta");
    res.status(200).json(debugResponse);
  } catch (error) {
    console.error("Error sending invoice:");
    res.status(500).json({ message: "Error sending invoice", error });
  }
};

