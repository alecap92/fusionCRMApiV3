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
const addressSchema = new mongoose_1.Schema({
    street: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    country: { type: String, required: false },
    zipCode: { type: String, required: false },
}, { _id: false } // Prevents Mongoose from creating an _id field for this subdocument
);
const customerSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.ObjectId, required: false },
    firstName: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String },
    address: addressSchema,
    taxId: { type: String },
});
const invoiceItemSchema = new mongoose_1.Schema({
    description: { type: String, required: false },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
});
const invoiceSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
});
const Invoice = mongoose_1.default.model("Invoice", invoiceSchema);
exports.default = Invoice;
