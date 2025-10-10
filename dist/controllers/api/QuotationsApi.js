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
exports.downloadQuotationApi = exports.createQuotationApi = void 0;
const QuotationModel_1 = __importDefault(require("../../models/QuotationModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const printQuotationService_1 = require("../../services/quotation/printQuotationService");
const createQuotationApi = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
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
        const organizationId = (_a = req.apiUser) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.apiUser) === null || _b === void 0 ? void 0 : _b._id;
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
                message: "Faltan datos requeridos: Cliente, cotizacion y totals son obligatorios",
                code: "MISSING_REQUIRED_FIELDS",
            });
        }
        // Validar campos del cliente (soporte para mayúsculas y minúsculas)
        const clientMobile = Cliente.Mobile || Cliente.mobile;
        const clientName = Cliente.Nombre || Cliente.name;
        if (!clientMobile || !clientName) {
            return res.status(400).json({
                message: "El cliente debe tener mobile y name (o Mobile y Nombre)",
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
        const organization = yield OrganizationModel_1.default.findOne({
            _id: organizationId,
        });
        if (!organization) {
            return res.status(400).json({
                message: "Organización no encontrada",
                code: "ORGANIZATION_NOT_FOUND",
            });
        }
        // Obtener e incrementar el número de cotización de forma atómica
        const updatedOrganization = yield OrganizationModel_1.default.findOneAndUpdate({ _id: organizationId }, { $inc: { "settings.quotations.quotationNumber": 1 } }, { new: true, upsert: false });
        if (!updatedOrganization) {
            return res.status(404).json({
                message: "Organización no encontrada durante la actualización",
                code: "ORGANIZATION_UPDATE_FAILED",
            });
        }
        const currentQuotationNumber = updatedOrganization.settings.quotations.quotationNumber;
        try {
            // Validar si el contacto existe, si no, crearlo
            let contactId;
            const contactExists = yield ContactModel_1.default.findOne({
                "properties.key": "mobile",
                "properties.value": clientMobile,
                organizationId,
            });
            if (contactExists) {
                contactId = contactExists._id;
                // Actualizar datos del contacto si han cambiado
                const firstNameProp = contactExists.properties.find((p) => p.key === "firstName");
                const lastNameProp = contactExists.properties.find((p) => p.key === "lastName");
                const mobileProp = contactExists.properties.find((p) => p.key === "mobile");
                const idNumberProp = contactExists.properties.find((p) => p.key === "idNumber");
                const needsUpdate = (firstNameProp && firstNameProp.value !== clientName) ||
                    (mobileProp && mobileProp.value !== clientMobile) ||
                    (idNumberProp && idNumberProp.value !== (Cliente.Nit || Cliente.id));
                if (needsUpdate) {
                    // Actualizar properties específicas
                    const updateData = {};
                    if (firstNameProp && firstNameProp.value !== clientName) {
                        updateData["properties.$.value"] = clientName;
                        yield ContactModel_1.default.updateOne({ _id: contactExists._id, "properties.key": "firstName" }, { $set: updateData });
                    }
                    if (mobileProp && mobileProp.value !== clientMobile) {
                        yield ContactModel_1.default.updateOne({ _id: contactExists._id, "properties.key": "mobile" }, { $set: { "properties.$.value": clientMobile } });
                    }
                    const clientId = Cliente.Nit || Cliente.id;
                    if (clientId && idNumberProp && idNumberProp.value !== clientId) {
                        yield ContactModel_1.default.updateOne({ _id: contactExists._id, "properties.key": "idNumber" }, { $set: { "properties.$.value": clientId } });
                    }
                }
            }
            else {
                // Crear el contacto con properties
                const properties = [
                    { value: clientName || "", key: "firstName", isVisible: true },
                    { value: "", key: "lastName", isVisible: true },
                    { value: "", key: "position", isVisible: false },
                    {
                        value: Cliente.Email || Cliente.email || "",
                        key: "email",
                        isVisible: false,
                    },
                    { value: "", key: "phone", isVisible: true },
                    { value: clientMobile, key: "mobile", isVisible: true },
                    {
                        value: Cliente.Direccion || Cliente.direccion || "",
                        key: "address",
                        isVisible: false,
                    },
                    {
                        value: Cliente.Ciudad || Cliente.ciudad || "",
                        key: "city",
                        isVisible: false,
                    },
                    {
                        value: Cliente.Estado || Cliente.estado || "",
                        key: "state",
                        isVisible: false,
                    },
                    { value: "", key: "country", isVisible: false },
                    { value: "", key: "comments", isVisible: false },
                    { value: "NIT", key: "idType", isVisible: false },
                    {
                        value: Cliente.Nit || Cliente.id || "",
                        key: "idNumber",
                        isVisible: false,
                    },
                    {
                        value: Cliente.Empresa || Cliente.empresa || "",
                        key: "companyName",
                        isVisible: false,
                    },
                    {
                        value: Cliente.CompanyType || Cliente.companyType || "",
                        key: "companyType",
                        isVisible: false,
                    },
                ];
                const newContact = yield ContactModel_1.default.create({
                    organizationId,
                    properties,
                });
                contactId = newContact._id;
            }
            // Transformar los items de cotización al formato esperado por el modelo
            const items = cotizacion.map((item) => ({
                name: item.producto,
                description: item.descripcion,
                quantity: item.cantidad,
                unitPrice: item.precio,
                taxes: item.iva,
                total: item.total,
                imageUrl: item.imageUrl || item.imagen || "", // Soporte para imageUrl o imagen
            }));
            // Crear la cotización
            const newQuotation = yield QuotationModel_1.default.create({
                contactId,
                quotationNumber: Number(currentQuotationNumber),
                items,
                optionalItems: [], // Inicializar array vacío
                expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
                lastModified: new Date(),
                name: `${currentQuotationNumber} - ${clientName}`, // Formato consistente con el ejemplo
                observaciones: `Forma de pago: ${totals.forma_De_Pago || totals.forma_de_pago}. Tiempo de entrega: ${totals.tiempo_de_entrega || totals.tiempo_De_Entrega}`,
                paymentTerms: totals.forma_De_Pago || totals.forma_de_pago,
                shippingTerms: totals.tiempo_de_entrega || totals.tiempo_De_Entrega,
                status: "draft",
                subtotal: totals.subtotal,
                taxes: totals.iva,
                discounts: 0, // Por defecto sin descuentos
                total: totals.total,
                userId,
                organizationId,
            });
            // Obtener la cotización creada con el contacto poblado
            const quotation = yield QuotationModel_1.default.findById(newQuotation._id).populate("contactId");
            res.status(201).json({
                message: "Cotización creada exitosamente",
                data: quotation,
                quotationNumber: currentQuotationNumber,
            });
        }
        catch (creationError) {
            // Si hay error en la creación, revertir el incremento del número de cotización
            yield OrganizationModel_1.default.findOneAndUpdate({ _id: organizationId }, { $inc: { "settings.quotations.quotationNumber": -1 } });
            // Re-lanzar el error para que sea capturado por el catch principal
            throw creationError;
        }
    }
    catch (error) {
        console.error("Error creating quotation:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            code: "INTERNAL_SERVER_ERROR",
            error: process.env.NODE_ENV === "development" ? error : undefined,
        });
    }
});
exports.createQuotationApi = createQuotationApi;
const downloadQuotationApi = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Obtener organizationId del token de API
        const organizationId = (_a = req.apiUser) === null || _a === void 0 ? void 0 : _a.organizationId;
        const quotationNumber = req.params.number;
        if (!organizationId) {
            return res.status(401).json({
                message: "Token de API no válido",
                code: "INVALID_API_TOKEN",
            });
        }
        if (!quotationNumber) {
            return res.status(400).json({
                message: "Número de cotización es requerido",
                code: "MISSING_QUOTATION_NUMBER",
            });
        }
        // Validar que la cotización existe y pertenece a la organización
        const quotation = yield QuotationModel_1.default.findOne({
            quotationNumber: Number(quotationNumber),
            organizationId: organizationId,
        });
        if (!quotation) {
            return res.status(404).json({
                message: "Cotización no encontrada",
                code: "QUOTATION_NOT_FOUND",
            });
        }
        // Generar el PDF
        const { pdfBuffer } = yield (0, printQuotationService_1.generateQuotationPdf)(quotationNumber, organizationId);
        // Configurar headers para descarga
        const filename = `Cotizacion_${quotationNumber}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        // Enviar el PDF
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error downloading quotation:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            code: "INTERNAL_SERVER_ERROR",
            error: process.env.NODE_ENV === "development" ? error : undefined,
        });
    }
});
exports.downloadQuotationApi = downloadQuotationApi;
