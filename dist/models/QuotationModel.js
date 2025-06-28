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
const itemSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    taxes: { type: Number, required: true },
    total: { type: Number, required: true },
    imageUrl: { type: String },
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product" },
});
const quotationSchema = new mongoose_1.Schema({
    quotationNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    observaciones: { type: String },
    contactId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Contact", required: true },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    lastModified: { type: Date, default: Date.now },
});
const Quotation = mongoose_1.default.model("Quotation", quotationSchema);
exports.default = Quotation;
