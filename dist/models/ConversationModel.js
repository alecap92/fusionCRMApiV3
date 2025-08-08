"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const participantSchema = new mongoose_1.Schema({
    user: {
        type: { type: String, required: true, enum: ["User"] },
        reference: {
            type: mongoose_1.Schema.Types.ObjectId,
            required: true,
        },
    },
    contact: {
        type: { type: String, required: true, enum: ["Contact"] },
        reference: { type: String, required: true },
        displayInfo: {
            mobile: { type: String },
            name: { type: String },
            lastName: { type: String },
            email: { type: String },
            position: { type: String },
            contactId: { type: String },
        },
    },
});
const metadataSchema = new mongoose_1.Schema({
    key: { type: String, required: true },
    value: { type: mongoose_1.Schema.Types.Mixed, required: true },
});
const automationHistorySchema = new mongoose_1.Schema({
    automationType: { type: String, required: true },
    triggeredAt: { type: Date, required: true },
    triggeredBy: {
        type: mongoose_1.Schema.Types.Mixed,
        ref: "User",
        validate: {
            validator: function (v) {
                return (v === "system" ||
                    v instanceof mongoose_1.Types.ObjectId ||
                    typeof v === "undefined");
            },
            message: "triggeredBy debe ser 'system' o un ObjectId válido",
        },
    },
});
const automationSettingsSchema = new mongoose_1.Schema({
    isPaused: { type: Boolean, default: false },
    pausedUntil: { type: Date },
    pausedBy: {
        type: mongoose_1.Schema.Types.Mixed,
        ref: "User",
        validate: {
            validator: function (v) {
                return (v === "system" ||
                    v instanceof mongoose_1.Types.ObjectId ||
                    typeof v === "undefined");
            },
            message: "pausedBy debe ser 'system' o un ObjectId válido",
        },
    },
    pauseReason: {
        type: String,
        enum: ["30m", "1h", "3h", "6h", "12h", "1d", "forever"],
    },
    lastAutomationTriggered: { type: Date },
    automationHistory: [automationHistorySchema],
});
const conversationSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    organization: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    participants: participantSchema,
    lastMessage: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Message",
    },
    lastMessageTimestamp: { type: Date },
    unreadCount: { type: Number, default: 0 },
    pipeline: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ConversationPipeline",
        required: true,
    },
    currentStage: { type: Number, default: 0 },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    isResolved: { type: Boolean, default: false },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
    },
    tags: [{ type: String }],
    firstContactTimestamp: { type: Date },
    metadata: [metadataSchema],
    isArchived: { type: Boolean, default: false },
    automationSettings: {
        type: automationSettingsSchema,
        default: () => ({
            isPaused: false,
            automationHistory: [],
        }),
    },
}, { timestamps: true });
// Índices para mejorar el rendimiento
conversationSchema.index({ organization: 1 });
conversationSchema.index({
    organization: 1,
    pipeline: 1,
    currentStage: 1,
    lastMessageTimestamp: -1,
});
conversationSchema.index({ assignedTo: 1 });
conversationSchema.index({ lastMessageTimestamp: -1 });
conversationSchema.index({ isResolved: 1 });
conversationSchema.index({ tags: 1 });
conversationSchema.index({ leadScore: -1 });
// Nuevos índices para automatizaciones
conversationSchema.index({ "automationSettings.isPaused": 1 });
conversationSchema.index({ "automationSettings.pausedUntil": 1 });
exports.default = (0, mongoose_1.model)("Conversation", conversationSchema);
