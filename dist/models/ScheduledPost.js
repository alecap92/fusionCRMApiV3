"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const scheduledPostSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    socialAccountId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "SocialAccount",
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    mediaUrls: {
        type: [String],
        default: [],
    },
    scheduledFor: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["draft", "scheduled", "published", "failed"],
        default: "draft",
    },
    errorMessage: {
        type: String,
        default: null,
    },
    facebookAccountId: {
        type: String,
        default: "",
    },
    instagramAccountId: {
        type: String,
        default: "",
    },
    platforms: {
        type: [String],
        default: [],
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("ScheduledPost", scheduledPostSchema);
