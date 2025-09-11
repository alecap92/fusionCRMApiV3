"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const N8nSchema = new mongoose_1.Schema({
    endpoint: {
        type: String,
        required: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    apiKey: {
        type: String,
        trim: true,
    },
    method: {
        type: String,
        required: true,
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        default: "POST",
    },
    target: {
        type: [String],
        required: true,
        enum: ["Mensajes", "Contactos", "Contacto", "Negocios"],
        default: ["Mensajes"],
    },
    needData: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("N8n", N8nSchema);
