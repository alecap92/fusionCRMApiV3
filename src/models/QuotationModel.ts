import mongoose, { Schema, Document } from "mongoose";

interface Item extends Document {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxes: number;
  total: number;
  imageUrl?: string;
  productId?: mongoose.Schema.Types.ObjectId;
}

interface Quotation extends Document {
  quotationNumber: number;
  name: string;
  observaciones?: string;
  contactId: mongoose.Schema.Types.ObjectId;
  organizationId: mongoose.Schema.Types.ObjectId;
  creationDate: Date;
  expirationDate: Date;
  paymentTerms: string;
  shippingTerms: string;
  items: Item[];
  optionalItems: [];
  subtotal: number;
  taxes: number;
  discounts: number;
  total: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "canceled" | "expired";
  additionalNotes?: string;
  userId: mongoose.Schema.Types.ObjectId;
  lastModified: Date;
}

const itemSchema = new Schema<Item>({
  name: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxes: { type: Number, required: true },
  total: { type: Number, required: true },
  imageUrl: { type: String },
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
});

const quotationSchema = new Schema<Quotation>({
  quotationNumber: { type: Number, required: true },
  name: { type: String, required: true },
  observaciones: { type: String },
  contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  creationDate: { type: Date, default: Date.now },
  expirationDate: { type: Date, required: true },
  paymentTerms: { type: String, required: true },
  shippingTerms: { type: String, required: true },
  items: [itemSchema],
  optionalItems: [],
  subtotal: { type: Number, required: true },
  taxes: { type: Number, required: true },
  discounts: { type: Number },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ["draft", "sent", "accepted", "rejected", "canceled", "expired"],
    default: "draft",
  },
  additionalNotes: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastModified: { type: Date, default: Date.now },
});

const Quotation = mongoose.model<Quotation>("Quotation", quotationSchema);

export default Quotation;
