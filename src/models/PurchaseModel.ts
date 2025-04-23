import mongoose, { Schema, Document } from "mongoose";

// Definición del esquema para los Items dentro de una orden de compra
interface PurchaseItem extends Document {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
}

// Definición del esquema para las órdenes de compra
interface PurchaseOrder extends Document {
  orderNumber: string; // Número de orden
  supplierId: mongoose.Schema.Types.ObjectId; // ProveedorId
  purchaseDate: Date; // FechaDeCompra

  tax: number; // Tax (Impuesto)
  total: number; // Total
  description?: string; // Descripcion
  paymentMethod: string; // paymentMethod
  items: PurchaseItem[]; // Lista de Items
  discounts?: number; // Discounts
  status: "pending" | "completed" | "canceled"; // Estado de la orden
  userId: mongoose.Schema.Types.ObjectId; // Id del usuario que realiza la orden
  lastModified: Date; // Fecha de la última modificación
  organizationId: mongoose.Schema.Types.ObjectId; // Id de la organización
}

// Esquema de Items para la Orden de Compra
const purchaseItemSchema = new Schema<PurchaseItem>({
  name: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
});

// Esquema para Orden de Compra
const purchaseOrderSchema = new Schema<PurchaseOrder>(
  {
    orderNumber: { type: String, required: true }, // Número de orden
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    }, // Referencia al proveedor
    purchaseDate: { type: Date, default: Date.now }, // Fecha de compra
    tax: { type: Number, required: true }, // Impuestos
    total: { type: Number, required: true }, // Total
    description: { type: String }, // Descripción opcional
    paymentMethod: { type: String, required: true }, // Método de pago
    items: [purchaseItemSchema], // Lista de Items
    discounts: { type: Number }, // Descuento aplicado
    status: {
      type: String,
      enum: ["pending", "completed", "canceled"],
      default: "pending", // Estado por defecto pendiente
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Usuario que realiza la orden
    lastModified: { type: Date, default: Date.now }, // Fecha de última modificación
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const PurchaseOrder = mongoose.model<PurchaseOrder>(
  "PurchaseOrder",
  purchaseOrderSchema
);

export default PurchaseOrder;
