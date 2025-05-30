"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const pipelineStageSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    order: { type: Number, required: true },
    color: { type: String, default: "#808080" },
    autoAssign: { type: Boolean, default: false },
    assignToTeam: { type: mongoose_1.Schema.Types.ObjectId, ref: "Team" },
});
const conversationPipelineSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    organization: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    stages: [pipelineStageSchema],
    isDefault: { type: Boolean, default: false },
}, { timestamps: true });
// Índices para mejorar el rendimiento en búsquedas
conversationPipelineSchema.index({ organization: 1, isDefault: 1 });
exports.default = (0, mongoose_1.model)("ConversationPipeline", conversationPipelineSchema);
