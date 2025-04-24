"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const statusSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    order: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    pipeline: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Pipeline",
        required: true,
    },
    color: {
        type: String,
        required: true,
        default: "#000000", // Default color
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Status", statusSchema);
