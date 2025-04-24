"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const socialAccountSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    platform: {
        type: String,
        enum: ["facebook", "instagram"],
        required: true,
    },
    accountId: {
        type: String,
        required: false,
    },
    username: {
        type: String,
        required: false,
    },
    accessToken: {
        type: String,
        required: true,
    },
    refreshToken: {
        type: String,
    },
    picture: {
        type: String,
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("SocialAccount", socialAccountSchema);
