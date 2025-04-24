"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const dealsSchema = new mongoose_1.Schema({
    title: {
        type: String,
    },
    amount: {
        type: Number,
    },
    closingDate: {
        type: Date,
    },
    pipeline: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Pipeline",
        required: true,
    },
    status: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Status",
        default: null,
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
    associatedContactId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Contact",
        required: false,
    },
    associatedCompanyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Company",
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Deal", dealsSchema);
