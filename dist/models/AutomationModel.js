"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const AutomationNodeSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ["trigger", "action", "condition", "delay"],
        required: true,
    },
    module: { type: String, required: true },
    event: { type: String },
    data: {
        message: { type: String },
        delay: { type: Number },
        delayType: { type: String },
        to: { type: String },
        subject: { type: String },
        emailBody: { type: String },
        url: { type: String },
        method: { type: String },
        headers: { type: mongoose_1.Schema.Types.Mixed },
        body: { type: mongoose_1.Schema.Types.Mixed },
        condition: {
            field: { type: String },
            operator: {
                type: String,
                enum: [
                    "equals",
                    "contains",
                    "starts_with",
                    "ends_with",
                    "regex",
                    "not_equals",
                    "greater_than",
                    "less_than",
                ],
            },
            value: { type: String },
        },
        payloadMatch: { type: mongoose_1.Schema.Types.Mixed },
        webhookId: { type: String },
        keywords: [{ type: String }],
    },
    next: [{ type: String }],
    trueBranch: { type: String },
    falseBranch: { type: String },
    position: {
        x: { type: Number },
        y: { type: Number },
    },
    selected: { type: Boolean },
    dragging: { type: Boolean },
    payloadMatch: { type: mongoose_1.Schema.Types.Mixed },
});
const EdgeSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String },
});
const AutomationSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    isActive: { type: Boolean, default: false },
    nodes: [AutomationNodeSchema],
    edges: [EdgeSchema],
    triggerType: {
        type: String,
        enum: [
            "message_received",
            "conversation_started",
            "keyword",
            "scheduled",
            "webhook",
            "deal",
            "contact",
            "task",
            "manual",
            "whatsapp_message",
        ],
        required: true,
    },
    triggerConditions: {
        keywords: [{ type: String }],
        patterns: [{ type: String }],
        webhookId: { type: String },
        dealStatus: {
            from: { type: String },
            to: { type: String },
        },
    },
    conversationSettings: {
        pauseOnUserReply: { type: Boolean, default: true },
        maxMessagesPerSession: { type: Number, default: 10 },
        sessionTimeout: { type: Number, default: 30 }, // minutos
    },
    automationType: {
        type: String,
        enum: ["workflow", "conversation"],
        default: "workflow",
    },
    status: {
        type: String,
        enum: ["active", "inactive", "draft"],
        default: "inactive",
    },
    lastRun: { type: Date },
    runsCount: { type: Number, default: 0 },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    stats: {
        totalExecutions: { type: Number, default: 0 },
        successfulExecutions: { type: Number, default: 0 },
        failedExecutions: { type: Number, default: 0 },
        lastExecutedAt: { type: Date },
    },
}, {
    timestamps: true,
});
// Índices para búsqueda eficiente
AutomationSchema.index({ organizationId: 1, isActive: 1 });
AutomationSchema.index({ triggerType: 1, isActive: 1 });
AutomationSchema.index({ "triggerConditions.keywords": 1 });
AutomationSchema.index({ automationType: 1, organizationId: 1 });
// Método para determinar el tipo de trigger basado en los nodos
AutomationSchema.methods.detectTriggerType = function () {
    const triggerNode = this.nodes.find((node) => node.type === "trigger");
    if (!triggerNode)
        return "manual";
    // Mapear módulos a tipos de trigger
    if (triggerNode.module === "whatsapp") {
        if (triggerNode.event === "conversation_started")
            return "conversation_started";
        if (triggerNode.event === "keyword")
            return "keyword";
        if (triggerNode.event === "whatsapp_message")
            return "whatsapp_message";
        return "message_received";
    }
    if (triggerNode.module === "webhook")
        return "webhook";
    if (triggerNode.module === "deal" || triggerNode.module === "deals")
        return "deal";
    if (triggerNode.module === "contact" || triggerNode.module === "contacts")
        return "contact";
    if (triggerNode.module === "task" || triggerNode.module === "tasks")
        return "task";
    return "manual";
};
const AutomationModel = mongoose_1.default.model("Automation", AutomationSchema);
exports.default = AutomationModel;
