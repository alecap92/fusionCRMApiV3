"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const activitySchema = new mongoose_1.Schema({
    activityType: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    notes: {
        type: String,
    },
    status: {
        type: String,
        required: true,
        enum: ["incomplete", "complete"],
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    contactId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Contact",
        required: true,
    },
    reminder: {
        type: String,
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Activity", activitySchema);
