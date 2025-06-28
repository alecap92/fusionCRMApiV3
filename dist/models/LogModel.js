"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const logSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        enum: ["LOGOUT_ALL"], // Podemos agregar más tipos en el futuro
    },
    data: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: "Organization",
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
// Índices para mejorar el rendimiento de las consultas
logSchema.index({ type: 1, timestamp: -1 });
logSchema.index({ organizationId: 1, timestamp: -1 });
logSchema.index({ userId: 1, timestamp: -1 });
const LogModel = (0, mongoose_1.model)("Log", logSchema);
exports.default = LogModel;
