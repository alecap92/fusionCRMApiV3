"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const IntegrationSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
    },
    service: {
        type: String,
        required: true,
        enum: [
            "whatsapp",
            "formuapp",
            "openai",
            "sendinblue",
            "notion",
            "stripe",
            "claude",
            "googleMaps",
            // puedes agregar más aquí
        ],
    },
    name: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    credentials: {
        type: mongoose_1.Schema.Types.Mixed, // objeto libre para tokens, claves, etc.
        required: true,
    },
    settings: {
        type: mongoose_1.Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Integration", IntegrationSchema);
