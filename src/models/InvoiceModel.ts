import mongoose, { Schema, Document, Types } from "mongoose";

interface Customer {
  _id: Types.ObjectId;
  firstName: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  taxId?: string;
}

interface InvoiceItem extends Document {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

interface Invoice extends Document {
  number: string;
  date: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  terms?: string;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
}

const addressSchema = new Schema(
  {
    street: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    country: { type: String, required: false },
    zipCode: { type: String, required: false },
  },
  { _id: false } // Prevents Mongoose from creating an _id field for this subdocument
);

const customerSchema = new Schema<Customer>({
  _id: { type: Schema.Types.ObjectId, required: false },
  firstName: { type: String, required: true },
  email: { type: String, required: false },
  phone: { type: String },
  address: addressSchema,
  taxId: { type: String },
});

const invoiceItemSchema = new Schema<InvoiceItem>({
  description: { type: String, required: false },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
});

const invoiceSchema = new Schema<Invoice>(
  {
    number: { type: String, required: true },
    date: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    customer: { type: customerSchema, required: true },
    items: [invoiceItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    notes: { type: String },
    terms: { type: String },
    paymentMethod: { type: String },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Invoice = mongoose.model<Invoice>("Invoice", invoiceSchema);

export default Invoice;
