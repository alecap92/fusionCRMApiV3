import mongoose, { Document, Schema, Types } from "mongoose";

interface IResolutionNumber {
  type_document_id: string;
  prefix: string;
  resolution: string;
  resolution_date: string;
  from: string;
  to: string;
  date_from: string;
  date_to: string;
  technical_key: string;
}

interface ICompanyInfo {
  email: string;
  address: string;
  phone: string;
  municipality_id: string;
  type_document_identification_id: string;
  type_organization_id: string;
  type_regime_id: string;
  type_liability_id: string;
  business_name: string;
  nit: string;
  dv: string;
}

interface IPlaceholders {
  paymentTerms: string;
  currency: string;
  notes: string;
  logoImg: string;
  foot_note: string;
  head_note: string;
  shippingTerms: string;
}

interface IEmail {
  mail_username: string;
  mail_password: string;
  mail_host: string;
  mail_port: number;
  mail_encryption: string;
}

interface ISoftware {
  id: string;
  pin: string;
}

interface ICertificado {
  certificate: string | File | null;
  password: string;
}

interface ICreditNote {
  resolution: string;
  prefix: string;
  nextCreditNoteNumber: string;
  head_note: string;
  foot_note: string;
}

export interface IInvoiceConfiguration extends Document {
  _id: string;
  nextInvoiceNumber: string;
  resolutionNumber: IResolutionNumber;
  companyInfo: ICompanyInfo;
  placeholders: IPlaceholders;
  token?: string;
  organizationId?: string;
  email: IEmail;
  software: ISoftware;
  certificado: ICertificado;
  status: boolean;
  creditNote: ICreditNote;
}

const ResolutionNumberSchema = new Schema<IResolutionNumber>({
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

const CompanyInfoSchema = new Schema<ICompanyInfo>({
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

const PlaceholdersSchema = new Schema<IPlaceholders>({
  paymentTerms: { type: String, required: true },
  currency: { type: String, required: true },
  notes: { type: String, required: true },
  logoImg: { type: String, required: true },
  foot_note: { type: String, required: true },
  head_note: { type: String, required: true },
  shippingTerms: { type: String, required: true },
});

const EmailSchema = new Schema<IEmail>({
  mail_username: { type: String, required: true },
  mail_password: { type: String, required: true },
  mail_host: { type: String, required: true },
  mail_port: { type: Number, required: true },
  mail_encryption: { type: String, required: true },
});

const SoftwareSchema = new Schema({
  id: { type: String, required: true },
  pin: { type: String, required: true },
});

const CertificadoSchema = new Schema<ICertificado>({
  certificate: { type: String, required: true },
  password: { type: String, required: true },
});

const CreditNoteSchema = new Schema<any>({
  resolution: { type: String, required: false, default: "0000000000" },
  prefix: { type: String, required: true, default: "NC" },
  nextCreditNoteNumber: { type: String, required: true },
  head_note: { type: String, required: false },
  foot_note: { type: String, required: false },
})

const InvoiceConfigurationSchema = new Schema<IInvoiceConfiguration>({
  _id: { type: String, required: true },
  nextInvoiceNumber: { type: String, required: true },
  resolutionNumber: { type: ResolutionNumberSchema, required: true },
  companyInfo: { type: CompanyInfoSchema, required: true },
  placeholders: { type: PlaceholdersSchema, required: true },
  token: { type: String, required: true },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  email: { type: EmailSchema, required: true },
  software: { type: SoftwareSchema, required: true },
  certificado: { type: CertificadoSchema, required: true },
  status: { type: Boolean, required: true, default: false },
  creditNote: { type: CreditNoteSchema, required: false },
});

export default mongoose.model<IInvoiceConfiguration>(
  "InvoiceConfiguration",
  InvoiceConfigurationSchema
);
