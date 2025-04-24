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
// Esquema de Items para la Orden de Compra
const purchaseItemSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
});
// Esquema para Orden de Compra
const purchaseOrderSchema = new mongoose_1.Schema({
    orderNumber: { type: String, required: true }, // Número de orden
    supplierId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true }, // Usuario que realiza la orden
    lastModified: { type: Date, default: Date.now }, // Fecha de última modificación
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
}, {
    timestamps: true,
});
const PurchaseOrder = mongoose_1.default.model("PurchaseOrder", purchaseOrderSchema);
exports.default = PurchaseOrder;
