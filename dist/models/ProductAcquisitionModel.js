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
const productAcquisitionSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    clientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Contact',
        required: true
    },
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variantId: {
        type: mongoose_1.Schema.Types.Mixed,
        ref: 'ProductVariant',
        default: ""
    },
    dealId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Deal'
    },
    quotationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Quotation'
    },
    invoiceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    quantity: { type: Number, required: true, min: 1 },
    priceAtAcquisition: { type: Number, required: true, min: 0 },
    acquisitionDate: { type: Date, required: true },
    status: {
        type: String,
        required: true,
        enum: ["active", "cancelled", "returned", "pending", "completed"],
        default: "active"
    },
    notes: { type: String },
    tags: [{ type: String }],
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
// Índices para mejorar el rendimiento de las consultas
productAcquisitionSchema.index({ organizationId: 1, clientId: 1 });
productAcquisitionSchema.index({ organizationId: 1, productId: 1 });
productAcquisitionSchema.index({ organizationId: 1, status: 1 });
productAcquisitionSchema.index({ organizationId: 1, acquisitionDate: 1 });
const ProductAcquisitionModel = mongoose_1.default.model("ProductAcquisition", productAcquisitionSchema);
exports.default = ProductAcquisitionModel;
