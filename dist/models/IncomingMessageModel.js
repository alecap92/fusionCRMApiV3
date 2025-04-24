"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const incomingMessageSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    organization: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    from: { type: String, required: true },
    to: { type: String, required: true },
    message: { type: String, required: true },
    mediaUrl: { type: String },
    mediaId: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date, required: true, default: Date.now },
    type: { type: String, required: true },
    direction: { type: String, default: "incoming", enum: ["incoming"] },
    isRead: { type: Boolean, default: false }, // Campo para indicar si el mensaje ha sido leído
    possibleName: { type: String },
});
exports.default = (0, mongoose_1.model)("IncomingMessage", incomingMessageSchema);
