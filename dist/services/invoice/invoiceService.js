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
exports.downloadPdfInvoice = exports.downloadXmlInvoice = exports.createCreditNoteInApi = exports.getInvoicesFromApi = exports.createInvoiceInApi = exports.getTechnicalKey = exports.changeEnvironment = exports.configResolution = exports.certificateUpload = exports.softwareConfiguration = exports.createConfiguration = void 0;
const axios_1 = __importDefault(require("axios"));
const InvoiceConfiguration_1 = __importDefault(require("../../models/InvoiceConfiguration"));
/*
@ Proceso de configuracion de la empresa en microservicio de facturacion
1. Se configura la empresa
2. Se configura el software
3. Se sube el certificado
4. Se configura la resolución
5. Se crea la empresa en la API de facturación

Importantes - Debbug:
- enviar /setDePruebas  en /invoice para la aprobacion.
- Actualizar la resolucion por la nueva.
- La diferencia entre AUTORIZACION y HABILITACION es que habilitacion aumenta los numeros que se acabaron, autorizacion es para nuevas.
- Technical_key: es diferente de desarrollador a produccion, hay que usar el endpoint de "/numbering-range", tambien trae el resto de info de la resolucion.
- El companyName se puede obtener del endpoint: (http://apidian2024.oo/api/ubl2.1/SearchCompany/1124024319)
- No olvidar cambiar la url del microservicio de habilitacion a produccion. asi como el id dentro del modelo company.
*/
const createConfiguration = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!organizationId) {
            throw new Error("Organization ID is required");
        }
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const body = {
            type_document_identification_id: Number(data.companyInfo.type_document_identification_id),
            type_organization_id: Number(data.companyInfo.type_organization_id),
            type_regime_id: Number(data.companyInfo.type_regime_id),
            type_liability_id: Number(data.companyInfo.type_liability_id),
            business_name: data.companyInfo.business_name,
            merchant_registration: "0000000-00",
            municipality_id: Number(data.companyInfo.municipality_id),
            address: data.companyInfo.address,
            phone: Number(data.companyInfo.phone),
            email: data.companyInfo.email,
            mail_host: data.email.mail_host,
            mail_port: String(data.email.mail_port),
            mail_username: data.email.mail_username,
            mail_password: data.email.mail_password,
            mail_encryption: data.email.mail_encryption,
        };
        const response = yield axios_1.default.post(`${process.env.FACTURACION_API_URL}/ubl2.1/config/${data.companyInfo.nit}/${data.companyInfo.dv}`, body);
        // save token to database
        yield InvoiceConfiguration_1.default.updateOne({
            organizationId,
        }, { $set: { token: response.data.token } });
        return response.data;
    }
    catch (error) {
        console.error(error);
        throw new Error("Internal Server Error");
    }
});
exports.createConfiguration = createConfiguration;
const softwareConfiguration = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!organizationId) {
            throw new Error("Organization ID is required");
        }
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const body = {
            id: data.software.id,
            pin: Number(data.software.pin),
        };
        const response = yield axios_1.default.put(`${process.env.FACTURACION_API_URL}/ubl2.1/config/software`, body, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error(error.response.data);
        throw new Error("Internal Server Error");
    }
});
exports.softwareConfiguration = softwareConfiguration;
const certificateUpload = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!organizationId) {
            throw new Error("Organization ID is required");
        }
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const body = {
            certificate: data.certificado.certificate,
            password: data.certificado.password,
        };
        const response = yield axios_1.default.put(`${process.env.FACTURACION_API_URL}/ubl2.1/config/certificate`, body, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error(error);
        throw new Error("Internal Server Error");
    }
});
exports.certificateUpload = certificateUpload;
const configResolution = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!organizationId) {
            throw new Error("Organization ID is required");
        }
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const body = {
            type_document_id: data.resolutionNumber.type_document_id,
            prefix: data.resolutionNumber.prefix,
            resolution: data.resolutionNumber.resolution,
            resolution_date: data.resolutionNumber.resolution_date,
            technical_key: data.resolutionNumber.technical_key,
            from: data.resolutionNumber.from,
            to: data.resolutionNumber.to,
            generated_to_date: 0,
            date_from: data.resolutionNumber.date_from,
            date_to: data.resolutionNumber.date_to,
        };
        const response = yield axios_1.default.put(`${process.env.FACTURACION_API_URL}/ubl2.1/config/resolution`, body, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error(error.response.data);
        throw new Error("Internal Server Error");
    }
});
exports.configResolution = configResolution;
const changeEnvironment = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!organizationId) {
            throw new Error("Organization ID is required");
        }
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const body = {
            type_environment_id: 1,
            payroll_type_environment_id: 1,
            eqdocs_type_environment_id: 1,
        };
        const response = yield axios_1.default.put(`${process.env.FACTURACION_API_URL}/ubl2.1/config/environment`, body, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error(error);
        throw new Error("Internal Server Error");
    }
});
exports.changeEnvironment = changeEnvironment;
const getTechnicalKey = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!organizationId) {
            throw new Error("Organization ID is required");
        }
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const body = {
            IDSoftware: data.software.id,
        };
        const response = yield axios_1.default.post(`${process.env.FACTURACION_API_URL}/ubl2.1/numbering-range`, body, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        const newTechnicalKey = response.data.ResponseDian.Envelope.Body.GetNumberingRangeResponse.GetNumberingRangeResult.ResponseList.NumberRangeResponse.TechnicalKey;
        const form = {
            "type_document_id": data.resolutionNumber.type_document_id,
            "prefix": data.resolutionNumber.prefix,
            "resolution": data.resolutionNumber.resolution,
            "resolution_date": data.resolutionNumber.resolution_date,
            "technical_key": newTechnicalKey,
            "from": data.resolutionNumber.from,
            "to": data.resolutionNumber.to,
            "generated_to_date": 0,
            "date_from": data.resolutionNumber.date_from,
            "date_to": data.resolutionNumber.date_to
        };
        yield axios_1.default.put(`${process.env.FACTURACION_API_URL}/ubl2.1/config/resolution`, form, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        // save technical key to database
        yield InvoiceConfiguration_1.default.updateOne({
            organizationId,
        }, { $set: { software: { technical_key: newTechnicalKey } } });
        return response.data;
    }
    catch (error) {
        console.error(error);
        throw new Error("Internal Server Error");
    }
});
exports.getTechnicalKey = getTechnicalKey;
const createInvoiceInApi = (invoice, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const response = yield axios_1.default.post(`${process.env.FACTURACION_API_URL}/ubl2.1/invoice`, invoice, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        if (response.data.ResponseDian.Envelope.Body.SendBillSyncResponse.SendBillSyncResult.isValid === 'false') {
            throw new Error("Invalid invoice: " + response.data.ResponseDian.Envelope.Body.SendBillSyncResponse.SendBillSyncResult.ResponseList.InvoiceResponse.InvoiceID);
        }
        return response.data;
    }
    catch (error) {
        console.error(error.response.data);
        throw new Error("Internal Server Error");
    }
});
exports.createInvoiceInApi = createInvoiceInApi;
const getInvoicesFromApi = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const response = yield axios_1.default.get(`${process.env.FACTURACION_API_URL}/information/${data.companyInfo.nit}`, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error(error);
        throw new Error("Internal Server Error");
    }
});
exports.getInvoicesFromApi = getInvoicesFromApi;
const createCreditNoteInApi = (creditNote, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const response = yield axios_1.default.post(`${process.env.FACTURACION_API_URL}/ubl2.1/credit-note`, creditNote, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.log(error);
        throw new Error(`Internal Server Error: ${error.response.data.errors}`);
    }
});
exports.createCreditNoteInApi = createCreditNoteInApi;
const downloadXmlInvoice = (invoice, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const prefix = invoice.prefix;
        const invoiceNumber = invoice.number;
        const idNumber = invoice.idNumber || '900694948';
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        console.log(data === null || data === void 0 ? void 0 : data.token, "token");
        if (!data) {
            throw new Error("Company not found");
        }
        const response = yield axios_1.default.get(`${process.env.FACTURACION_API_URL}/invoice/${idNumber}/FES-${prefix}${invoiceNumber}.xml`, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
            responseType: 'arraybuffer'
        });
        return response.data;
    }
    catch (error) {
        console.error(error);
        throw new Error("Internal Server Error");
    }
});
exports.downloadXmlInvoice = downloadXmlInvoice;
const downloadPdfInvoice = (invoice, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield InvoiceConfiguration_1.default.findOne({
            organizationId,
        });
        if (!data) {
            throw new Error("Company not found");
        }
        const prefix = invoice.prefix;
        const invoiceNumber = invoice.number;
        const idNumber = invoice.idNumber || '900694948';
        const response = yield axios_1.default.get(`${process.env.FACTURACION_API_URL}/invoice/${idNumber}/FES-${prefix}${invoiceNumber}.pdf`, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
            },
            responseType: 'arraybuffer'
        });
        return response.data;
    }
    catch (error) {
        console.error(error);
        throw new Error("Internal Server Error");
    }
});
exports.downloadPdfInvoice = downloadPdfInvoice;
