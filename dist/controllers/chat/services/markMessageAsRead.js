"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markMessagesAsRead = void 0;
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const ConversationModel_1 = __importDefault(require("../../../models/ConversationModel"));
const markMessagesAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const body = req.body;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
    }
    if (!body.contact) {
        return res.status(400).json({ error: "Contact is required" });
    }
    try {
        // Actualizar los mensajes no leídos entrantes para marcarlos como leídos
        const updated = yield MessageModel_1.default.updateMany({
            isRead: false,
            organization: organizationId,
            $or: [{ from: body.contact }, { to: body.contact }],
        }, { $set: { isRead: true } });
        // Resetear el contador de no leídos en conversaciones relacionadas con este contacto
        try {
            const convResult = yield ConversationModel_1.default.updateMany({
                organization: organizationId,
                "participants.contact.reference": body.contact,
                unreadCount: { $gt: 0 },
            }, { $set: { unreadCount: 0 } });
            // Success: no noisy logs
        }
        catch (convErr) {
            console.error("Failed to reset conversations unreadCount by contact", convErr);
        }
        res.status(200).json({ message: "Messages marked as read", updated });
    }
    catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Error marking messages as read" });
    }
});
exports.markMessagesAsRead = markMessagesAsRead;
