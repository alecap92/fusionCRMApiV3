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
exports.sendQuotationEmail = exports.printQuotation = exports.advancedFilterQuotations = exports.deleteQuotation = exports.updateQuotation = exports.createQuotation = exports.searchQuotation = exports.getQuotations = exports.getQuotation = void 0;
const QuotationModel_1 = __importDefault(require("../../models/QuotationModel"));
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const printQuotationService_1 = require("../../services/quotation/printQuotationService");
const IntegrationsModel_1 = __importDefault(require("../../models/IntegrationsModel"));
// Get a single quotation by ID
const getQuotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const quotation = yield QuotationModel_1.default.findById({
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
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.getQuotation = getQuotation;
// Get all quotations
const getQuotations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        console.log(organizationId);
        const quotations = yield QuotationModel_1.default.find({ organizationId })
            .sort({ creationDate: -1, quotationNumber: -1 })
            .populate("contactId")
            .populate("organizationId")
            .populate("userId")
            .skip(skip)
            .limit(limit)
            .exec();
        const totalQuotations = yield QuotationModel_1.default.countDocuments({ organizationId });
        const parsedContacts = quotations.map((quotation) => {
            var _a, _b, _c, _d;
            const contact = quotation.contactId;
            if (!contact)
                return quotation;
            const firstName = ((_a = contact.properties.find((p) => p.key === "firstName")) === null || _a === void 0 ? void 0 : _a.value) || "";
            const lastName = ((_b = contact.properties.find((p) => p.key === "lastName")) === null || _b === void 0 ? void 0 : _b.value) || "";
            const email = ((_c = contact.properties.find((p) => p.key === "email")) === null || _c === void 0 ? void 0 : _c.value) || "";
            const mobile = ((_d = contact.properties.find((p) => p.key === "mobile")) === null || _d === void 0 ? void 0 : _d.value) || "";
            return Object.assign(Object.assign({}, quotation.toJSON()), { contactId: {
                    firstName,
                    lastName,
                    email,
                    mobile,
                } });
        });
        res.json({
            quotations: parsedContacts,
            totalPages: Math.ceil(totalQuotations / limit),
            currentPage: page,
            totalQuotations,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.getQuotations = getQuotations;
// Search for quotations based on a term
const searchQuotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { term } = req.query;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const quotations = yield QuotationModel_1.default.find({
            name: { $regex: term, $options: "i" },
            organizationId,
        })
            .populate("contactId")
            .sort({ creationDate: -1 });
        if (!quotations) {
            return res.status(404).json({ message: "Quotation not found" });
        }
        // Parse the contactId to get the firstName and lastName
        const parsedContacts = quotations.map((quotation) => {
            var _a, _b, _c, _d;
            const contact = quotation.contactId;
            if (!contact)
                return quotation;
            const firstName = ((_a = contact.properties.find((p) => p.key === "firstName")) === null || _a === void 0 ? void 0 : _a.value) || "";
            const lastName = ((_b = contact.properties.find((p) => p.key === "lastName")) === null || _b === void 0 ? void 0 : _b.value) || "";
            const email = ((_c = contact.properties.find((p) => p.key === "email")) === null || _c === void 0 ? void 0 : _c.value) || "";
            const mobile = ((_d = contact.properties.find((p) => p.key === "mobile")) === null || _d === void 0 ? void 0 : _d.value) || "";
            return Object.assign(Object.assign({}, quotation.toJSON()), { contactId: {
                    firstName,
                    lastName,
                    email,
                    mobile,
                } });
        });
        res.status(200).json({
            quotations: parsedContacts,
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.searchQuotation = searchQuotation;
// Create a new quotation
const createQuotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
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
        const newQuotation = new QuotationModel_1.default(formatedQuotation);
        yield newQuotation.save();
        if (newQuotation) {
            // increase quotation count
            const number = yield OrganizationModel_1.default.findByIdAndUpdate(organizationId, {
                $inc: { "settings.quotations.quotationNumber": 1 },
            });
            console.log(number);
        }
        res.status(201).json(newQuotation);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error", err });
    }
});
exports.createQuotation = createQuotation;
// Update a quotation by ID
const updateQuotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedQuotation = yield QuotationModel_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedQuotation) {
            return res.status(404).json({ message: "Quotation not found" });
        }
        res.json(updatedQuotation);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.updateQuotation = updateQuotation;
// Delete a quotation by ID
const deleteQuotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedQuotation = yield QuotationModel_1.default.findByIdAndDelete(req.params.id);
        if (!deletedQuotation) {
            return res.status(404).json({ message: "Quotation not found" });
        }
        res.json({ message: "Quotation deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.deleteQuotation = deleteQuotation;
// Advanced filter for quotations
const advancedFilterQuotations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = req.body;
        const quotations = yield QuotationModel_1.default.find(filters);
        res.json(quotations);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.advancedFilterQuotations = advancedFilterQuotations;
const printQuotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        console.log(id, organizationId);
        if (!organizationId) {
            return res.status(400).json({ message: "ID de organización no proporcionado" });
        }
        // Utilizar el servicio para generar el PDF
        const { pdfBuffer } = yield (0, printQuotationService_1.generateQuotationPdf)(id, organizationId.toString());
        // Enviar el PDF como respuesta
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${(0, printQuotationService_1.getQuotationPdfFilename)(id)}`);
        res.status(200).end(pdfBuffer);
    }
    catch (error) {
        console.error("Error generando la cotización en PDF:", error);
        res.status(500).json({
            message: "Error generando la cotización en PDF",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
});
exports.printQuotation = printQuotation;
const sendQuotationEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { quotationNumber, to, from, subject, message, templateId } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const emailConfig = yield IntegrationsModel_1.default.findOne({
            organizationId,
            service: "brevo"
        });
        if (!emailConfig) {
            return res.status(400).json({ message: "Email configuration not found" });
        }
        const config = emailConfig.credentials;
        const apiKey = config.apiKey;
        if (!quotationNumber || !to || !subject || !organizationId) {
            return res.status(400).json({ message: "Faltan datos requeridos para enviar el correo" });
        }
        // Utilizar el servicio para generar el PDF
        const { pdfBuffer } = yield (0, printQuotationService_1.generateQuotationPdf)(quotationNumber, organizationId.toString());
        // Convertir el PDF a base64
        const pdfBase64 = (0, printQuotationService_1.getPdfAsBase64)(pdfBuffer);
        // Importar el servicio de Brevo
        const { sendEmailWithBrevo } = require('../../services/email/brevoEmailService');
        // Crear el HTML para el cuerpo del correo (solo se usará si no hay templateId)
        const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Cotización #${quotationNumber}</h2>
        <p>${message || 'Adjunto encontrará la cotización solicitada.'}</p>
        <p>Saludos cordiales,<br>Equipo de ventas</p>
      </div>
    `;
        // Configurar los parámetros para el servicio de email
        const emailParams = {
            to: to,
            subject: subject,
            html: emailHtml,
            from: from,
            attachments: [
                {
                    content: pdfBase64,
                    name: (0, printQuotationService_1.getQuotationPdfFilename)(quotationNumber),
                    contentType: 'application/pdf'
                }
            ],
            organizationId: organizationId.toString(),
            api_key: apiKey || ''
        };
        // Si hay templateId, añadirlo a los parámetros
        if (templateId) {
            emailParams.templateId = templateId;
        }
        // Enviar el correo con Brevo
        yield sendEmailWithBrevo(emailParams);
        res.status(200).json({ message: "Cotización enviada correctamente" });
    }
    catch (error) {
        console.error('Error al enviar cotización por correo:', error);
        res.status(500).json({
            message: "Error enviando el correo de la cotización",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
});
exports.sendQuotationEmail = sendQuotationEmail;
