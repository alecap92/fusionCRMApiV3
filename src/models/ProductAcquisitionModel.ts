import mongoose, { Schema, Document, Types } from "mongoose";

interface ProductAcquisition extends Document {
  organizationId: Types.ObjectId;
  clientId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | string;
  dealId?: Types.ObjectId;
  quotationId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  quantity: number;
  priceAtAcquisition: number;
  acquisitionDate: Date;
  status: string;
  notes?: string;
  tags?: string[];
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productAcquisitionSchema = new Schema<ProductAcquisition>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: "Contact",
    required: true,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: Schema.Types.Mixed,
    ref: "ProductVariant",
    default: undefined,
  },
  dealId: {
    type: Schema.Types.ObjectId,
    ref: "Deal",
  },
  quotationId: {
    type: Schema.Types.ObjectId,
    ref: "Quotation",
  },
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: "Invoice",
  },
  quantity: { type: Number, required: true, min: 1 },
  priceAtAcquisition: { type: Number, required: true, min: 0 },
  acquisitionDate: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ["active", "cancelled", "returned", "pending", "completed"],
    default: "active",
  },
  notes: { type: String },
  tags: [{ type: String }],
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices para mejorar el rendimiento de las consultas
productAcquisitionSchema.index({ organizationId: 1, clientId: 1 });
productAcquisitionSchema.index({ organizationId: 1, productId: 1 });
productAcquisitionSchema.index({ organizationId: 1, status: 1 });
productAcquisitionSchema.index({ organizationId: 1, acquisitionDate: 1 });

const ProductAcquisitionModel = mongoose.model<ProductAcquisition>(
  "ProductAcquisition",
  productAcquisitionSchema
);

export default ProductAcquisitionModel;
