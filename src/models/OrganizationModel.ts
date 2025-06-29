import { Schema, model, Document } from "mongoose";

interface IAddress {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface masiveEmails {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

interface ISettings {
  whatsapp: {
    accessToken: string;
    numberIdIdentifier: string;
    phoneNumber: string;
    whatsAppBusinessAccountID: string;
  };
  formuapp: {
    apiKey: string;
  };
  purchases: {
    purchaseNumber: number;
    paymentTerms: Array<string>;
    shippingTerms: Array<string>;
    currency: string;
    notes: string;
  };
  quotations: {
    quotationNumber: number;
    paymentTerms: Array<string>;
    shippingTerms: Array<string>;
    currency: string;
    notes: string;
    bgImage: string;
    footerText: string;
  };
  googleMaps: {
    apiKey: string;
  };
  masiveEmails: masiveEmails;
  invoiceSettings: IInvoiceSettings;
}

interface IContactProperty {
  label: string;
  key: string;
  isVisible: boolean;
}

export interface IOrganization extends Document {
  companyName: string;
  address: IAddress;
  phone: string;
  whatsapp: string;
  email: string;
  employees: string[];
  settings: ISettings;
  contactProperties: IContactProperty[];
  _id: string;
  logoUrl: string;
  iconUrl: string;
  createdAt: Date;
  updatedAt: Date;
  idType: string;
  idNumber: string;
}

interface IInvoiceSettings {
  type_document_id: number;
  prefix: string;
  resolution: number;
  resolution_date: string;
  technical_key: string;
  from: number;
  to: number;
  generated_to_date: number;
  date_from: string;
  date_to: string;
}

const addressSchema = new Schema<IAddress>({
  address: { type: String },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
  country: { type: String },
});

const settingsSchema = new Schema<ISettings>({
  whatsapp: {
    accessToken: { type: String },
    numberIdIdentifier: { type: String },
    phoneNumber: { type: String },
    whatsAppBusinessAccountID: { type: String },
  },
  formuapp: {
    apiKey: { type: String },
  },
  purchases: {
    purchaseNumber: { type: Number },
    paymentTerms: { type: Array },
    shippingTerms: { type: Array },
    currency: { type: String },
    notes: { type: String },
  },
  quotations: {
    quotationNumber: { type: Number },
    paymentTerms: { type: Array },
    shippingTerms: { type: Array },
    currency: { type: String },
    notes: { type: String },
    bgImage: { type: String },
    footerText: { type: String },
  },
  googleMaps: {
    apiKey: { type: String },
  },
  masiveEmails: {
    apiKey: { type: String },
    senderEmail: { type: String },
    senderName: { type: String },
  },
  invoiceSettings: {
    type_document_id: { type: Number },
    prefix: { type: String },
    resolution: { type: Number },
    resolution_date: { type: String },
    technical_key: { type: String },
    from: { type: Number },
    to: { type: Number },
    generated_to_date: { type: Number },
    date_from: { type: String },
    date_to: { type: String },
  },
});

const contactPropertySchema = new Schema<IContactProperty>({
  label: { type: String, required: true },
  key: { type: String, required: true },
  isVisible: { type: Boolean, required: true },
});

const organizationSchema = new Schema<IOrganization>({
  companyName: {
    type: String,
  },
  logoUrl: {
    type: String,
  },
  iconUrl: {
    type: String,
  },

  address: {
    type: addressSchema,
  },

  phone: {
    type: String,
  },
  whatsapp: {
    type: String,
  },
  email: {
    type: String,
  },
  employees: [
    {
      type: String,
      ref: "User",
    },
  ],
  settings: {
    type: settingsSchema,
  },
  contactProperties: {
    type: [contactPropertySchema],
    default: [
      { label: "Nombre", key: "name", isVisible: true },
      { label: "Apellido", key: "lastName", isVisible: true },
      { label: "Posición", key: "position", isVisible: false },
      { label: "Email", key: "email", isVisible: true },
      { label: "Teléfono", key: "phone", isVisible: false },
      { label: "Teléfono Móvil", key: "mobile", isVisible: false },
      { label: "Dirección", key: "address", isVisible: false },
      { label: "Ciudad", key: "city", isVisible: false },
      { label: "País", key: "country", isVisible: false },
      { label: "Comentarios", key: "comments", isVisible: false },
      { label: "Tipo de ID", key: "idType", isVisible: false },
      { label: "Número de ID", key: "idNumber", isVisible: false },
    ],
  },
  idType: {
    type: String,
    default: "Nit",
  },
  idNumber: {
    type: String,
    default: "0000000000",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default model<IOrganization>("Organization", organizationSchema);
