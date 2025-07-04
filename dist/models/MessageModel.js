"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const reactionSchema = new mongoose_1.Schema({
    reaction: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: Date, required: true },
});
const messageSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
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
    direction: { type: String, required: true, enum: ["incoming", "outgoing"] },
    isRead: { type: Boolean, default: false }, // Solo aplica para "incoming"
    possibleName: { type: String }, // Podría ser opcional o no según tus necesidades
    replyToMessage: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Message",
    },
    messageId: { type: String },
    reactions: [reactionSchema],
    conversation: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
});
// Agregar índice único compuesto para evitar duplicados
messageSchema.index({ messageId: 1, organization: 1 }, { unique: true, sparse: true });
exports.default = (0, mongoose_1.model)("Message", messageSchema);
