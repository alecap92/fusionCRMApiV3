"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInvoice = exports.searchInvoice = exports.deleteInvoice = exports.updateInvoice = exports.getInvoice = exports.getInvoices = exports.createInvoice = void 0;
const InvoiceModel_1 = __importDefault(require("../../models/InvoiceModel"));
const invoiceService_1 = require("../../services/invoice/invoiceService");
const InvoiceConfiguration_1 = __importDefault(require("../../models/InvoiceConfiguration"));
const jszip_1 = __importDefault(require("jszip"));
const brevoEmailService_1 = require("../../services/email/brevoEmailService");
const IntegrationsModel_1 = __importDefault(require("../../models/IntegrationsModel"));
// Create Invoice
const createInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const invoice = req.body;
        console.log(invoice, "invoice");
        const response = yield (0, invoiceService_1.createInvoiceInApi)(invoice, organizationId);
        console.log(response, "response");
        // update next invoice number
        yield InvoiceConfiguration_1.default.findOneAndUpdate({ organizationId }, { $set: { nextInvoiceNumber: (Number(invoice.number) + 1).toString() } });
        res.status(200).json(response);
    }
    catch (error) {
        console.error("Error creating invoice:");
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createInvoice = createInvoice;
// Get all Invoices
const getInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const invoices = yield (0, invoiceService_1.getInvoicesFromApi)(organizationId);
        if (!invoices || invoices.length === 0) {
            return res.status(404).json({ message: "No invoices found" });
        }
        res.status(200).json(invoices);
    }
    catch (error) {
        console.error("Error getting invoices:", error);
        res.status(500).json({ message: "Error getting invoices", error });
    }
});
exports.getInvoices = getInvoices;
// Read Invoice (your existing getInvoice function)
const getInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const invoiceId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        const invoice = yield InvoiceModel_1.default.findOne({
            _id: invoiceId,
            userId,
            organizationId,
        });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        res.status(200).json(invoice);
    }
    catch (error) {
        console.error("Error getting invoice:", error);
        res.status(500).json({ message: "Error getting invoice", error });
    }
});
exports.getInvoice = getInvoice;
// Update Invoice
const updateInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const invoiceId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        const updatedInvoice = yield InvoiceModel_1.default.findOneAndUpdate({ _id: invoiceId, userId, organizationId }, req.body, { new: true });
        if (!updatedInvoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        res.status(200).json(updatedInvoice);
    }
    catch (error) {
        console.error("Error updating invoice:", error);
        res.status(500).json({ message: "Error updating invoice", error });
    }
});
exports.updateInvoice = updateInvoice;
// Delete Invoice
const deleteInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const invoiceId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        const deletedInvoice = yield InvoiceModel_1.default.findOneAndDelete({
            _id: invoiceId,
            userId,
            organizationId,
        });
        if (!deletedInvoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        res.status(200).json({ message: "Invoice deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting invoice:", error);
        res.status(500).json({ message: "Error deleting invoice", error });
    }
});
exports.deleteInvoice = deleteInvoice;
// Search/List Invoices with filters
const searchInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = -1, search = "", startDate, endDate, status, } = req.query;
        const query = {
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
    }
    catch (error) {
        console.error("Error searching invoices:", error);
        res.status(500).json({ message: "Error searching invoices", error });
    }
});
exports.searchInvoice = searchInvoice;
// Send Invoice
const sendInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const invoice = req.body;
        const { to, subject, text } = req.body;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        // obtener info sobre el servicio como: from, apikey
        const emailConfig = yield IntegrationsModel_1.default.findOne({
            organizationId,
            service: "brevo"
        });
        if (!emailConfig) {
            return res.status(400).json({ message: "Email configuration not found" });
        }
        const config = emailConfig.credentials;
        const from = config.from;
        const apiKey = config.apiKey;
        if (!invoice.number && !invoice.prefix) {
            return res.status(400).json({ message: "Invoice number and prefix are required" });
        }
        if (!invoice.subject && !invoice.to) {
            return res.status(400).json({ message: "Invoice subject and to are required" });
        }
        console.log(invoice, "invoice");
        if (!invoice.content && !invoice.html) {
            return res.status(400).json({ message: "Invoice message content or html are required" });
        }
        const xmlInvoice = yield (0, invoiceService_1.downloadXmlInvoice)(invoice, organizationId);
        const pdfInvoice = yield (0, invoiceService_1.downloadPdfInvoice)(invoice, organizationId);
        // compress data into a zip file
        const zip = new jszip_1.default();
        zip.file("invoice.xml", xmlInvoice);
        zip.file("invoice.pdf", pdfInvoice);
        const zipBuffer = yield zip.generateAsync({ type: "nodebuffer" });
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
        yield (0, brevoEmailService_1.sendEmailWithBrevo)({
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
    }
    catch (error) {
        console.error("Error sending invoice:");
        res.status(500).json({ message: "Error sending invoice", error });
    }
});
exports.sendInvoice = sendInvoice;
