interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxes: number;
  total: number;
  name: string;
  imageUrl: string;
}

type EmailCCItem = {
  email: string;
}

type Customer = {
  identification_number: number;
  dv: number;
  name: string;
  phone: string;
  address: string;
  email: string;
  merchant_registration: string;
  type_document_identification_id: number;
  type_organization_id: number;
  type_liability_id: number;
  municipality_id: number;
  type_regime_id: number;
}

type PaymentForm = {
  payment_form_id: number;
  payment_method_id: number;
  payment_due_date: string;
  duration_measure: string;
}

type LegalMonetaryTotals = {
  line_extension_amount: string;
  tax_exclusive_amount: string;
  tax_inclusive_amount: string;
  payable_amount: string;
}

type TaxTotal = {
  tax_id: number;
  tax_amount: string;
  percent: string;
  taxable_amount: string;
}

type InvoiceLine = {
  unit_measure_id: number;
  invoiced_quantity: string;
  line_extension_amount: string;
  free_of_charge_indicator: boolean;
  tax_totals: TaxTotal[];
  description: string;
  notes: string;
  code: string;
  type_item_identification_id: number;
  price_amount: string;
  base_quantity: string;
}

export type IApiInvoice = {
  _id: string;
  number: number; // get from database
  type_document_id: number; // hardcoded
  date: string; //get from invoice
  time: string;  //get from invoice
  resolution_number: string; // get from configurationInvoice.
  prefix: string; // get from configurationInvoice.
  notes: string; // get from configurationInvoice.
  disable_confirmation_text: boolean; // hardcoded
  establishment_name: string;  // get from configurationInvoice.
  establishment_address: string;  // get from configurationInvoice.
  establishment_phone: string; // get from configurationInvoice.
  establishment_municipality: number; // get from configurationInvoice.
  establishment_email: string; // get from configurationInvoice.
  sendmail: boolean; // hardcoded
  sendmailtome: boolean; // hardcoded
  send_customer_credentials: boolean; // hardcoded
  annexes: any[]; // hardcoded
  html_header: string; // get from configurationInvoice.
  html_buttons: string; // get from configurationInvoice.
  html_footer: string; // get from configurationInvoice.
  head_note: string; // get from configurationInvoice.
  foot_note: string; // get from configurationInvoice.
  customer: Customer;  // get from quotation
  payment_form: PaymentForm; // get from configurationInvoice
  legal_monetary_totals: LegalMonetaryTotals; 
  tax_totals: TaxTotal[];
  invoice_lines: InvoiceLine[];
}

export interface InvoiceFilter {
  search?: string;
  status?: IApiInvoice[];
  dateRange?: {
    start: string;
    end: string;
  };
  customer?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface InvoiceConfig {
  type_document_identification_id: number;
  type_organization_id: number;
  type_regime_id: number;
  type_liability_id: number;
  business_name: string;
  merchant_registration: string;
  municipality_id: number;
  address: string;
  phone: number;
  email: string;
  mail_host: string;
  mail_port: string;
  mail_username: string;
  mail_password: string;
  mail_encryption: string;
  verification_number: string;
  id_number: string;
}

export interface VerificationData {
  id: string;
  pin: number;
}

export interface CertificateData {
  certificate: File | null;
  password: string;
}

export interface ResolutionData {
  type_document_id: number;
  prefix: string;
  resolution: string;
  resolution_date: string;
  technical_key: string;
  from: number;
  to: number;
  generated_to_date: number;
  date_from: string;
  date_to: string;
}


export interface IApiCreditNote  {
  number: number;
  type_document_id: number;
  date: string;
  time: string;
  resolution_number: string;
  prefix: string;
  notes: string;
  disable_confirmation_text: boolean;
  establishment_address: string;
  establishment_phone: string;
  establishment_municipality: number;
  establishment_email: string;
  sendmail: boolean;
  sendmailtome: boolean;
  send_customer_credentials: boolean;
  annexes: any[];
  html_header: string;
  html_buttons: string;
  html_footer: string;
  head_note: string;
  foot_note: string;
  customer: {
    identification_number: number;
    dv: string;
    name: string;
    phone: string;
    address: string;
    email: string;
    merchant_registration: string;
    type_document_identification_id: number;
    type_organization_id: number;
    type_liability_id: number;
    municipality_id: number;
    type_regime_id: number;
  };
  payment_form: {
    payment_form_id: number;
    payment_method_id: number;
    payment_due_date: string;
    duration_measure: string;
  };
  legal_monetary_totals: {
    line_extension_amount: string;
    tax_exclusive_amount: string;
    tax_inclusive_amount: string;
    allowance_total_amount: string;
    payable_amount: string;
  };
  tax_totals: Array<{
    tax_id: number;
    tax_amount: string;
    percent: string;
    taxable_amount: string;
  }>;
  invoice_lines: Array<{
    unit_measure_id: number;
    invoiced_quantity: string;
    line_extension_amount: string;
    free_of_charge_indicator: boolean;
    allowance_charges?: Array<{
      charge_indicator: boolean;
      allowance_charge_reason: string;
      amount: string;
      base_amount: string;
    }>;
    tax_totals: Array<{
      tax_id: number;
      tax_amount: string;
      taxable_amount: string;
      percent: string;
    }>;
    description: string;
    notes: string;
    code: string;
    type_item_identification_id: number;
    price_amount: string;
    base_quantity: string;
  }>;
  reference_invoice: {
    number: string;
    date: string;
    type_document_id: number;
  };
  reason_code: string;
  reason_description: string;
}