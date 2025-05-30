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
const KeyActivitySchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
}, { _id: false });
const ChannelSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    completionPercentage: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    keyActivities: [KeyActivitySchema],
}, { _id: false });
const FunnelSectionSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    leadCount: { type: Number, default: 0 },
    color: { type: String },
    content: {
        title: { type: String },
        description: { type: String },
        channels: [ChannelSchema],
    },
}, { _id: false });
const AudienceItemSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    completed: { type: Boolean, default: false },
    description: { type: String },
    examples: [String],
}, { _id: false });
const AudienceSectionSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    items: [AudienceItemSchema],
    tips: [String],
}, { _id: false });
const StrategySchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    funnel: {
        sections: [FunnelSectionSchema],
    },
    audience: {
        sections: [AudienceSectionSchema],
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Strategy", StrategySchema);
