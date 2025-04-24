"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/WebhookEndpointModel.ts
const mongoose_1 = require("mongoose");
// Esquema para WebhookEndpoint
const webhookEndpointSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    module: {
        type: String,
        required: true,
        trim: true,
    },
    event: {
        type: String,
        required: true,
        trim: true,
    },
    url: {
        type: String,
        trim: true,
    },
    uniqueId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    secret: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });
// Crear índices para búsquedas comunes
webhookEndpointSchema.index({ organizationId: 1 });
webhookEndpointSchema.index({ module: 1, event: 1 });
webhookEndpointSchema.index({ isActive: 1 });
webhookEndpointSchema.index({ uniqueId: 1 }, { unique: true });
const WebhookEndpointModel = (0, mongoose_1.model)("WebhookEndpoint", webhookEndpointSchema);
exports.default = WebhookEndpointModel;
