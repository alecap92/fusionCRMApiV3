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
exports.getChatsByContactId = void 0;
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const ContactModel_1 = __importDefault(require("../../../models/ContactModel"));
const getChatsByContactId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { page = 1, limit = 10 } = req.query;
        const contactId = req.params.contactId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        // Convertir page y limit a valores numéricos
        const pageNum = parseInt(page.toString(), 10);
        const limitNum = parseInt(limit.toString(), 10);
        if (!organizationId) {
            return res.status(401).json({ message: "No tienes permisos para obtener los chats" });
        }
        if (!contactId) {
            return res.status(400).json({ message: "El id del contacto es requerido" });
        }
        const query = {
            organization: organizationId,
            user: userId,
            $or: [{ from: contactId }, { to: contactId }],
        };
        const chats = yield MessageModel_1.default.find(query)
            .populate("replyToMessage")
            .sort({ timestamp: 1, _id: 1 })
            .skip(pageNum)
            .limit(limitNum);
        // Buscar si existe un contacto con el número de teléfono/móvil
        const contact = yield ContactModel_1.default.findOne({
            organizationId: organizationId,
            properties: {
                $elemMatch: {
                    $or: [
                        { key: 'phone', value: contactId },
                        { key: 'mobile', value: contactId }
                    ]
                }
            }
        });
        return res.status(200).json({
            messages: chats,
            isContact: (contact === null || contact === void 0 ? void 0 : contact._id) ? contact === null || contact === void 0 ? void 0 : contact._id : false
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error al obtener los chats" });
    }
});
exports.getChatsByContactId = getChatsByContactId;
