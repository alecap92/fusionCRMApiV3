import mongoose, { Schema, Document, Types } from "mongoose";

interface ProductVariant extends Document {
  organizationId: Types.ObjectId;
  productId: Types.ObjectId;
  attributeValues: {
    attributeName: string;
    valueId: string;
    value: string;
    displayName: string;
    imageUrl?: string;
    price?: number;
  }[];
  sku: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  isActive: boolean;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productVariantSchema = new Schema<ProductVariant>({
  organizationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true 
  },
  productId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product',
    required: true 
  },
  attributeValues: [{
    attributeName: { type: String, required: true },
    valueId: { type: String, required: false },
    value: { type: String, required: true },
    displayName: { type: String, required: true },
    price: { type: Number, required: false },
    imageUrl: { type: String, required: false }
  }],
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  stock: { type: Number },
  isActive: { type: Boolean, default: true },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índices para mejorar el rendimiento de las consultas
productVariantSchema.index({ organizationId: 1, productId: 1 });
productVariantSchema.index({ organizationId: 1, sku: 1 }, { unique: true });

const ProductVariantModel = mongoose.model<ProductVariant>("ProductVariant", productVariantSchema);

export default ProductVariantModel; 