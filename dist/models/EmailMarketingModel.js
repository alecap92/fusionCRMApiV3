"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const emailMarketingSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ["draft", "scheduled", "sent", "cancelled"],
        default: "draft",
    },
    emailTemplateId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "EmailTemplate",
        required: true,
    },
    recipients: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    scheduledAt: { type: Date },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: false },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("EmailMarketing", emailMarketingSchema);
