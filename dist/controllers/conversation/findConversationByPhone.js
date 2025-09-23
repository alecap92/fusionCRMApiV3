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
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const findConversationByPhone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
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
            .lean();
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "No se encontró conversación para este número",
            });
        }
        // Obtener el último mensaje real usando agregación
        const lastMessageAgg = yield MessageModel_1.default.aggregate([
            { $match: { conversation: conversation._id } },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
        ]);
        const lastMessage = lastMessageAgg[0] || null;
        // Buscar información del contacto
        let contact = null;
        const reference = (_c = (_b = conversation === null || conversation === void 0 ? void 0 : conversation.participants) === null || _b === void 0 ? void 0 : _b.contact) === null || _c === void 0 ? void 0 : _c.reference;
        if (reference) {
            try {
                contact = yield ContactModel_1.default.findOne({
                    organizationId,
                    $or: [
                        {
                            "properties.key": "mobile",
                            "properties.value": reference,
                        },
                        {
                            "properties.key": "phone",
                            "properties.value": reference,
                        },
                    ],
                })
                    .select("properties")
                    .lean();
            }
            catch (error) {
                console.error("Error obteniendo el contacto:", error);
            }
        }
        // Procesar la conversación
        const conversationObj = Object.assign({}, conversation);
        // Enriquecer con información del contacto
        if (reference) {
            const findProp = (key) => { var _a, _b; return (_b = (_a = contact === null || contact === void 0 ? void 0 : contact.properties) === null || _a === void 0 ? void 0 : _a.find((p) => p.key === key)) === null || _b === void 0 ? void 0 : _b.value; };
            conversationObj.participants.contact.displayInfo = {
                mobile: reference,
                name: findProp("firstName") || reference,
                lastName: findProp("lastName") || "",
                email: findProp("email") || "",
                position: findProp("position") || "",
                contactId: (contact === null || contact === void 0 ? void 0 : contact._id) || null,
            };
        }
        // Asignar el último mensaje real
        conversationObj.lastMessage = lastMessage;
        conversationObj.lastMessageTimestamp =
            (lastMessage === null || lastMessage === void 0 ? void 0 : lastMessage.timestamp) || conversation.lastMessageTimestamp;
        conversationObj.mobile = reference;
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
