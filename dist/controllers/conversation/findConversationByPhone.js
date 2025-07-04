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
exports.findConversationByPhone = void 0;
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const findConversationByPhone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { mobile } = req.query;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!mobile) {
        return res.status(400).json({
            success: false,
            message: "El parámetro mobile es requerido",
        });
    }
    try {
        // Buscar conversación por número de teléfono
        const conversation = yield ConversationModel_1.default.findOne({
            "participants.contact.reference": mobile,
            organization: organizationId,
        })
            .populate("assignedTo", "name email profilePicture")
            .populate("pipeline")
            .populate("lastMessage");
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "No se encontró conversación para este número",
            });
        }
        // Procesar la conversación
        const conversationObj = conversation.toObject();
        if (conversationObj.participants &&
            conversationObj.participants.contact &&
            typeof conversationObj.participants.contact.reference === "string") {
            conversationObj.participants.contact.displayInfo = {
                mobile: conversationObj.participants.contact.reference,
                name: conversationObj.participants.contact.reference,
            };
        }
        conversationObj.lastMessageTimestamp =
            (_b = conversationObj.lastMessage) === null || _b === void 0 ? void 0 : _b.timestamp;
        conversationObj.mobile = conversationObj.participants.contact.reference;
        return res.status(200).json({
            success: true,
            conversation: conversationObj,
        });
    }
    catch (error) {
        console.error("Error al buscar conversación por teléfono:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        });
    }
});
exports.findConversationByPhone = findConversationByPhone;
