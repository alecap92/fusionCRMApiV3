"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const documentSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    uploadDate: { type: Date, default: Date.now },
    status: {
        type: String,
        required: true,
        enum: ['active', 'archived'],
        default: 'active'
    },
    fileURL: { type: String, required: true },
    previewURL: { type: String },
    description: { type: String },
    tags: [{ type: String }],
    metadata: { type: mongoose_1.Schema.Types.Mixed },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
}, {
    timestamps: true
});
exports.default = (0, mongoose_1.model)("Document", documentSchema);
