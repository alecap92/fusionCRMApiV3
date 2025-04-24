"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// models/ExecutionLogModel.ts
const mongoose_1 = require("mongoose");
/**
 * Esquema para el modelo de log de ejecución
 */
const executionLogSchema = new mongoose_1.Schema({
    executionId: {
        type: String,
        required: true,
        index: true,
    },
    automationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Automation",
        required: true,
        index: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ["queued", "running", "completed", "failed", "skipped"],
        default: "queued",
        index: true,
    },
    startedAt: {
        type: Date,
        required: true,
    },
    completedAt: {
        type: Date,
    },
    executionTime: {
        type: Number,
    },
    input: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    output: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    error: {
        type: String,
    },
    logs: [
        {
            timestamp: Date,
            nodeId: String,
            level: String,
            action: String,
            message: String,
        },
    ],
}, { timestamps: true });
// Índices para consultas comunes
executionLogSchema.index({ automationId: 1, createdAt: -1 });
executionLogSchema.index({ organizationId: 1, createdAt: -1 });
executionLogSchema.index({ status: 1, organizationId: 1 });
const ExecutionLogModel = (0, mongoose_1.model)("ExecutionLog", executionLogSchema);
exports.default = ExecutionLogModel;
