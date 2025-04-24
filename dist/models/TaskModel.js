"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const taskSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: "No Iniciado",
        required: true,
    },
    dueDate: {
        type: Date,
        required: true,
    },
    timeline: {
        type: String,
        required: false,
    },
    budget: {
        type: Number,
        required: false,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
    notes: {
        type: String,
        required: false,
    },
    priority: {
        type: String,
        enum: ["Alta", "Media", "Baja"],
        default: "Baja",
        required: true,
    },
    projectId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Project",
        required: false,
    },
    contactId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Contact", // Nueva referencia al modelo de contactos
        required: false, // También opcional
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    responsibleId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    tags: {
        type: [String],
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Task", taskSchema);
