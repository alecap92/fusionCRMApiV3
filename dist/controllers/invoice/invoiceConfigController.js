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
exports.createCompany = exports.certificateConfiguration = exports.checkResolutionStatus = exports.getNextInvoiceNumber = exports.updateResolutionNumber = exports.updatePlaceholders = exports.updateEmailSettings = exports.updateCompanyInfo = exports.createInvoiceConfig = exports.updateInvoiceConfig = exports.getInvoiceConfig = void 0;
const InvoiceConfiguration_1 = __importDefault(require("../../models/InvoiceConfiguration"));
const invoiceService_1 = require("../../services/invoice/invoiceService");
const getInvoiceConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        console.log("Organization ID:", organizationId);
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const invoiceConfig = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!invoiceConfig) {
            return res
                .status(404)
                .json({ message: "Invoice configuration not found" });
        }
        res.status(200).json(invoiceConfig);
    }
    catch (error) {
        console.error("Error fetching invoice configuration:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getInvoiceConfig = getInvoiceConfig;
const updateInvoiceConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const response = yield InvoiceConfiguration_1.default.findOneAndUpdate({ organizationId }, { $set: req.body }, { new: true });
        if (!response) {
            return res
                .status(404)
                .json({ message: "Invoice configuration not found" });
        }
        res.status(200).json({
            message: "Invoice configuration updated successfully",
            data: response,
        });
    }
    catch (error) {
        console.error("Error updating invoice configuration:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateInvoiceConfig = updateInvoiceConfig;
const createInvoiceConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        // Verificar si ya existe una configuración para esta organización
        const existingConfig = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (existingConfig) {
            return res.status(400).json({
                message: "Invoice configuration already exists for this organization",
            });
        }
        // Asegurarnos de que el body tenga todos los campos requeridos
        const configData = {
            _id: req.body._id || `inv_${Date.now()}`,
            organizationId,
            token: req.body.token || "default_token",
            nextInvoiceNumber: req.body.nextInvoiceNumber || "1",
            // Configuración de resolución
            resolutionNumber: {
                type_document_id: ((_b = req.body.resolutionNumber) === null || _b === void 0 ? void 0 : _b.type_document_id) || "01",
                prefix: ((_c = req.body.resolutionNumber) === null || _c === void 0 ? void 0 : _c.prefix) || "FE",
                resolution: ((_d = req.body.resolutionNumber) === null || _d === void 0 ? void 0 : _d.resolution) || "0",
                resolution_date: ((_e = req.body.resolutionNumber) === null || _e === void 0 ? void 0 : _e.resolution_date) ||
                    new Date().toISOString().split("T")[0],
                from: ((_f = req.body.resolutionNumber) === null || _f === void 0 ? void 0 : _f.from) || "1",
                to: ((_g = req.body.resolutionNumber) === null || _g === void 0 ? void 0 : _g.to) || "1000",
                date_from: ((_h = req.body.resolutionNumber) === null || _h === void 0 ? void 0 : _h.date_from) ||
                    new Date().toISOString().split("T")[0],
                date_to: ((_j = req.body.resolutionNumber) === null || _j === void 0 ? void 0 : _j.date_to) ||
                    new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                        .toISOString()
                        .split("T")[0],
                technical_key: ((_k = req.body.resolutionNumber) === null || _k === void 0 ? void 0 : _k.technical_key) || "0",
            },
            // Información de la empresa
            companyInfo: {
                email: ((_l = req.body.companyInfo) === null || _l === void 0 ? void 0 : _l.email) || "ejemplo@empresa.com",
                address: ((_m = req.body.companyInfo) === null || _m === void 0 ? void 0 : _m.address) || "Dirección predeterminada",
                phone: ((_o = req.body.companyInfo) === null || _o === void 0 ? void 0 : _o.phone) || "3001234567",
                municipality_id: ((_p = req.body.companyInfo) === null || _p === void 0 ? void 0 : _p.municipality_id) || "11001",
                type_document_identification_id: ((_q = req.body.companyInfo) === null || _q === void 0 ? void 0 : _q.type_document_identification_id) || "31",
                type_organization_id: ((_r = req.body.companyInfo) === null || _r === void 0 ? void 0 : _r.type_organization_id) || "1",
                type_regime_id: ((_s = req.body.companyInfo) === null || _s === void 0 ? void 0 : _s.type_regime_id) || "48",
                type_liability_id: ((_t = req.body.companyInfo) === null || _t === void 0 ? void 0 : _t.type_liability_id) || "O-13",
                business_name: ((_u = req.body.companyInfo) === null || _u === void 0 ? void 0 : _u.business_name) || "Nombre de la empresa",
                nit: ((_v = req.body.companyInfo) === null || _v === void 0 ? void 0 : _v.nit) || "900123456",
                dv: ((_w = req.body.companyInfo) === null || _w === void 0 ? void 0 : _w.dv) || "7",
            },
            // Placeholders
            placeholders: {
                paymentTerms: ((_x = req.body.placeholders) === null || _x === void 0 ? void 0 : _x.paymentTerms) || "30 días",
                currency: ((_y = req.body.placeholders) === null || _y === void 0 ? void 0 : _y.currency) || "COP",
                notes: ((_z = req.body.placeholders) === null || _z === void 0 ? void 0 : _z.notes) || "Gracias por su compra",
                logoImg: ((_0 = req.body.placeholders) === null || _0 === void 0 ? void 0 : _0.logoImg) || "https://via.placeholder.com/150",
                foot_note: ((_1 = req.body.placeholders) === null || _1 === void 0 ? void 0 : _1.foot_note) || "Pie de página predeterminado",
                head_note: ((_2 = req.body.placeholders) === null || _2 === void 0 ? void 0 : _2.head_note) || "Encabezado predeterminado",
            },
            // Configuración de email
            email: {
                mail_username: ((_3 = req.body.email) === null || _3 === void 0 ? void 0 : _3.mail_username) || "ejemplo@empresa.com",
                mail_password: ((_4 = req.body.email) === null || _4 === void 0 ? void 0 : _4.mail_password) || "password_placeholder",
                mail_host: ((_5 = req.body.email) === null || _5 === void 0 ? void 0 : _5.mail_host) || "smtp.example.com",
                mail_port: ((_6 = req.body.email) === null || _6 === void 0 ? void 0 : _6.mail_port) || 587,
                mail_encryption: ((_7 = req.body.email) === null || _7 === void 0 ? void 0 : _7.mail_encryption) || "tls",
            },
            software: {
                id: ((_8 = req.body.software) === null || _8 === void 0 ? void 0 : _8.id) || "1",
                pin: ((_9 = req.body.software) === null || _9 === void 0 ? void 0 : _9.pin) || "1234",
            },
            certificado: {
                certificate: ((_10 = req.body.certificado) === null || _10 === void 0 ? void 0 : _10.certificate) || "certificado_placeholder.p12",
                password: ((_11 = req.body.certificado) === null || _11 === void 0 ? void 0 : _11.password) || "password_placeholder",
            },
            status: ((_12 = req.body) === null || _12 === void 0 ? void 0 : _12.status) || false,
        };
        const response = yield InvoiceConfiguration_1.default.create(configData);
        res.status(201).json({
            message: "Invoice configuration created successfully",
            data: response,
        });
    }
    catch (error) {
        console.error("Error creating invoice configuration:", error);
        // Si es un error de validación de Mongoose, enviar detalles al cliente
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors,
            });
        }
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createInvoiceConfig = createInvoiceConfig;
const updateCompanyInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const response = yield InvoiceConfiguration_1.default.findOneAndUpdate({ organizationId }, { $set: { companyInfo: req.body } }, { new: true });
        if (!response) {
            return res
                .status(404)
                .json({ message: "Invoice configuration not found" });
        }
        res.status(200).json({
            message: "Company information updated successfully",
            data: response.companyInfo,
        });
    }
    catch (error) {
        console.error("Error updating company information:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateCompanyInfo = updateCompanyInfo;
const updateEmailSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const response = yield InvoiceConfiguration_1.default.findOneAndUpdate({ organizationId }, { $set: { email: req.body } }, { new: true });
        if (!response) {
            return res
                .status(404)
                .json({ message: "Invoice configuration not found" });
        }
        res.status(200).json({
            message: "Email settings updated successfully",
            data: response.email,
        });
    }
    catch (error) {
        console.error("Error updating email settings:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateEmailSettings = updateEmailSettings;
const updatePlaceholders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const response = yield InvoiceConfiguration_1.default.findOneAndUpdate({ organizationId }, { $set: { placeholders: req.body } }, { new: true });
        if (!response) {
            return res
                .status(404)
                .json({ message: "Invoice configuration not found" });
        }
        res.status(200).json({
            message: "Placeholders updated successfully",
            data: response.placeholders,
        });
    }
    catch (error) {
        console.error("Error updating placeholders:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updatePlaceholders = updatePlaceholders;
const updateResolutionNumber = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const response = yield InvoiceConfiguration_1.default.findOneAndUpdate({ organizationId }, { $set: { resolutionNumber: req.body } }, { new: true });
        if (!response) {
            return res
                .status(404)
                .json({ message: "Invoice configuration not found" });
        }
        res.status(200).json({
            message: "Resolution number updated successfully",
            data: response.resolutionNumber,
        });
    }
    catch (error) {
        console.error("Error updating resolution number:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateResolutionNumber = updateResolutionNumber;
const getNextInvoiceNumber = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const config = yield InvoiceConfiguration_1.default.findOne({ organizationId });
        if (!config) {
            return res
                .status(404)
                .json({ message: "Invoice configuration not found" });
        }
        // Aquí puedes implementar tu lógica para calcular el siguiente número
        // Por ejemplo, podrías incrementar el último número utilizado
        const nextNumber = config.nextInvoiceNumber || "1";
        res.status(200).json({
            nextNumber,
        });
    }
    catch (error) {
        console.error("Error getting next invoice number:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getNextInvoiceNumber = getNextInvoiceNumber;
const checkResolutionStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const config = yield InvoiceConfiguration_1.default.findOne({ organizationId });
        if (!config) {
            return res
                .status(404)
                .json({ message: "Invoice configuration not found" });
        }
        // Verifica si la resolución sigue vigente
        const resolutionNumber = config.resolutionNumber;
        const currentDate = new Date();
        const dateFrom = (resolutionNumber === null || resolutionNumber === void 0 ? void 0 : resolutionNumber.date_from)
            ? new Date(resolutionNumber.date_from)
            : null;
        const dateTo = (resolutionNumber === null || resolutionNumber === void 0 ? void 0 : resolutionNumber.date_to)
            ? new Date(resolutionNumber.date_to)
            : null;
        let valid = false;
        let message = "Invalid resolution";
        let expiresIn = 0;
        if (dateFrom &&
            dateTo &&
            currentDate >= dateFrom &&
            currentDate <= dateTo) {
            valid = true;
            message = "Resolution is valid";
            // Calcular días restantes hasta expiración
            const diffTime = Math.abs(dateTo.getTime() - currentDate.getTime());
            expiresIn = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // en días
        }
        else if (dateFrom && dateTo && currentDate > dateTo) {
            message = "Resolution has expired";
        }
        else if (dateFrom && dateTo && currentDate < dateFrom) {
            message = "Resolution is not yet valid";
            // Calcular días hasta que la resolución sea válida
            const diffTime = Math.abs(dateFrom.getTime() - currentDate.getTime());
            expiresIn = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // en días
        }
        res.status(200).json({
            valid,
            message,
            expiresIn,
            resolutionNumber,
        });
    }
    catch (error) {
        console.error("Error checking resolution status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.checkResolutionStatus = checkResolutionStatus;
const certificateConfiguration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // parse from .p12 to string(base64)
        const { file } = req;
        const { password, token, organizationId } = req.body;
        // importante, enviar el password y el token
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const base64 = file.buffer.toString("base64");
        const response = yield InvoiceConfiguration_1.default.updateOne({
            organizationId,
        }, {
            $set: {
                certificado: {
                    certificate: base64,
                    password,
                },
            },
        });
        res.status(200).json({
            message: "File parsed successfully",
            data: response,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.certificateConfiguration = certificateConfiguration;
// Para ver documentacion, revisa el servicio de invoiceService.ts
const createCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const configStatus = [];
        const executeStep = (stepFunction, stepName) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield stepFunction(organizationId);
                configStatus.push({
                    step: stepName,
                    message: `${stepName} completed successfully`,
                    status: true,
                });
            }
            catch (error) {
                configStatus.push({
                    step: stepName,
                    message: error.message || `Error in ${stepName}`,
                    status: false,
                });
                throw new Error(`Failed at ${stepName}: ${error.message}`);
            }
        });
        // Ejecutar pasos en secuencia
        yield executeStep(invoiceService_1.createConfiguration, "Company Creation");
        yield executeStep(invoiceService_1.softwareConfiguration, "Software Configuration");
        yield executeStep(invoiceService_1.certificateUpload, "Certificate Configuration");
        yield executeStep(invoiceService_1.configResolution, "Resolution Configuration");
        // pasar a produccion
        yield executeStep(invoiceService_1.changeEnvironment, "Change Environment");
        // Obtener y actualizar el technical_key
        yield executeStep(invoiceService_1.getTechnicalKey, "Get Technical Key");
        // Verificar si todos los pasos fueron exitosos
        const allStepsSuccessful = configStatus.every((step) => step.status);
        if (!allStepsSuccessful) {
            return res.status(500).json({
                message: "Company creation process failed",
                status: false,
                configStatus,
            });
        }
        return res.status(200).json({
            message: "Company created successfully",
            status: true,
            configStatus,
        });
    }
    catch (error) {
        console.error("Error creating company:", error);
        console.log(error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            status: false,
        });
    }
});
exports.createCompany = createCompany;
