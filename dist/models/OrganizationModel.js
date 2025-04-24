"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const addressSchema = new mongoose_1.Schema({
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
});
const settingsSchema = new mongoose_1.Schema({
    whatsapp: {
        accessToken: { type: String },
        numberIdIdentifier: { type: String },
        phoneNumber: { type: String },
        whatsAppBusinessAccountID: { type: String },
    },
    formuapp: {
        apiKey: { type: String },
    },
    purchases: {
        purchaseNumber: { type: Number },
        paymentTerms: { type: Array },
        shippingTerms: { type: Array },
        currency: { type: String },
        notes: { type: String },
    },
    quotations: {
        quotationNumber: { type: Number },
        paymentTerms: { type: Array },
        shippingTerms: { type: Array },
        currency: { type: String },
        notes: { type: String },
        bgImage: { type: String },
        footerText: { type: String },
    },
    googleMaps: {
        apiKey: { type: String },
    },
    masiveEmails: {
        apiKey: { type: String },
        senderEmail: { type: String },
        senderName: { type: String },
    },
    invoiceSettings: {
        type_document_id: { type: Number },
        prefix: { type: String },
        resolution: { type: Number },
        resolution_date: { type: String },
        technical_key: { type: String },
        from: { type: Number },
        to: { type: Number },
        generated_to_date: { type: Number },
        date_from: { type: String },
        date_to: { type: String },
    },
});
const contactPropertySchema = new mongoose_1.Schema({
    label: { type: String, required: true },
    key: { type: String, required: true },
    isVisible: { type: Boolean, required: true },
});
const organizationSchema = new mongoose_1.Schema({
    companyName: {
        type: String,
    },
    logoUrl: {
        type: String,
    },
    address: {
        type: addressSchema,
    },
    phone: {
        type: String,
    },
    whatsapp: {
        type: String,
    },
    email: {
        type: String,
    },
    employees: [
        {
            type: String,
            ref: "User",
        },
    ],
    settings: {
        type: settingsSchema,
    },
    contactProperties: {
        type: [contactPropertySchema],
        default: [
            { label: "Nombre", key: "name", isVisible: true },
            { label: "Apellido", key: "lastName", isVisible: true },
            { label: "Posición", key: "position", isVisible: false },
            { label: "Email", key: "email", isVisible: true },
            { label: "Teléfono", key: "phone", isVisible: false },
            { label: "Teléfono Celular", key: "cellphone", isVisible: false },
            { label: "Dirección", key: "address", isVisible: false },
            { label: "Ciudad", key: "city", isVisible: false },
            { label: "País", key: "country", isVisible: false },
            { label: "Comentarios", key: "comments", isVisible: false },
            { label: "Tipo de ID", key: "idType", isVisible: false },
            { label: "Número de ID", key: "idNumber", isVisible: false },
        ],
    },
    idType: {
        type: String,
        default: "Nit",
    },
    idNumber: {
        type: String,
        default: "0000000000",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});
exports.default = (0, mongoose_1.model)("Organization", organizationSchema);
