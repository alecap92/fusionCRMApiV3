"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const emailTemplateSchema = new mongoose_1.Schema({
    emailJson: { type: mongoose_1.Schema.Types.Mixed, required: true }, // 🔹 Cambiado de String a Mixed
    emailHtml: { type: String, required: true },
    name: { type: String, required: true },
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "User" },
}, {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
});
exports.default = (0, mongoose_1.model)("EmailTemplate", emailTemplateSchema);
