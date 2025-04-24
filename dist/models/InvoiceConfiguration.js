"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ResolutionNumberSchema = new mongoose_1.Schema({
    type_document_id: { type: String, required: true },
    prefix: { type: String, required: true },
    resolution: { type: String, required: true },
    resolution_date: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    date_from: { type: String, required: true },
    date_to: { type: String, required: true },
    technical_key: { type: String, required: true },
});
const CompanyInfoSchema = new mongoose_1.Schema({
    email: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    municipality_id: { type: String, required: true },
    type_document_identification_id: { type: String, required: true },
    type_organization_id: { type: String, required: true },
    type_regime_id: { type: String, required: true },
    type_liability_id: { type: String, required: true },
    business_name: { type: String, required: true },
    nit: { type: String, required: true },
    dv: { type: String, required: true },
});
const PlaceholdersSchema = new mongoose_1.Schema({
    paymentTerms: { type: String, required: true },
    currency: { type: String, required: true },
    notes: { type: String, required: true },
    logoImg: { type: String, required: true },
    foot_note: { type: String, required: true },
    head_note: { type: String, required: true },
    shippingTerms: { type: String, required: true },
});
const EmailSchema = new mongoose_1.Schema({
    mail_username: { type: String, required: true },
    mail_password: { type: String, required: true },
    mail_host: { type: String, required: true },
    mail_port: { type: Number, required: true },
    mail_encryption: { type: String, required: true },
});
const SoftwareSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    pin: { type: String, required: true },
});
const CertificadoSchema = new mongoose_1.Schema({
    certificate: { type: String, required: true },
    password: { type: String, required: true },
});
const CreditNoteSchema = new mongoose_1.Schema({
    resolution: { type: String, required: false, default: "0000000000" },
    prefix: { type: String, required: true, default: "NC" },
    nextCreditNoteNumber: { type: String, required: true },
    head_note: { type: String, required: false },
    foot_note: { type: String, required: false },
});
const InvoiceConfigurationSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    nextInvoiceNumber: { type: String, required: true },
    resolutionNumber: { type: ResolutionNumberSchema, required: true },
    companyInfo: { type: CompanyInfoSchema, required: true },
    placeholders: { type: PlaceholdersSchema, required: true },
    token: { type: String, required: true },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    email: { type: EmailSchema, required: true },
    software: { type: SoftwareSchema, required: true },
    certificado: { type: CertificadoSchema, required: true },
    status: { type: Boolean, required: true, default: false },
    creditNote: { type: CreditNoteSchema, required: false },
});
exports.default = mongoose_1.default.model("InvoiceConfiguration", InvoiceConfigurationSchema);
