import mongoose, { Schema, Document } from "mongoose";

interface Product extends Document {
  organizationId: string;
  name: string;
  description?: string;
  unitPrice: number;
  taxes?: number;
  imageUrl?: string;
  cost?: number;
  sku?: string;
  categoryId?: string;
  notes?: string;
  dimensions?: {
    width: number;
    height: number;
    length: number;
  };
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  hasVariants: boolean;
  variantAttributes?: string[];
  baseVariantId?: string;
}

const productSchema = new Schema<Product>({
  name: { type: String, required: true },
  description: { type: String },
  unitPrice: { type: Number },
  taxes: { type: Number },
  imageUrl: { type: String },
  cost: { type: Number },
  sku: { type: String },
  categoryId: { type: String },
  notes: { type: String },
  organizationId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  dimensions: {
    width: { type: Number },
    height: { type: Number },
    length: { type: Number },
  },
  userId: { type: String },
  hasVariants: { type: Boolean, default: false },
  variantAttributes: [{ type: String }],
  baseVariantId: { type: String }
});

const ProductModel = mongoose.model<Product>("Product", productSchema);

export default ProductModel;
