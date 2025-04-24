"use strict";
// controllers/messages/deleteChat.ts
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
exports.deleteChat = void 0;
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const cloudinaryUtils_1 = require("../../../utils/cloudinaryUtils");
const deleteChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = req.params.id;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!req.user) {
        return res.status(401).json({ error: "Usuario no autenticado" });
    }
    if (!id) {
        return res.status(400).json({ error: "Se requiere el contacto" });
    }
    try {
        // Encontrar los mensajes que serán eliminados
        const messagesToDelete = yield MessageModel_1.default.find({
            organization: organizationId,
            $or: [{ from: id }, { to: id }],
        });
        // Extraer los mediaIds de los mensajes
        const mediaIds = messagesToDelete
            .filter((msg) => msg.mediaId)
            .map((msg) => msg.mediaId);
        // Eliminar los archivos media de Cloudinary
        if (mediaIds.length > 0) {
            yield (0, cloudinaryUtils_1.deleteMediaFromCloudinary)(mediaIds);
        }
        // Eliminar los mensajes de la base de datos
        const deletedMessages = yield MessageModel_1.default.deleteMany({
            organization: organizationId,
            $or: [{ from: id }, { to: id }],
        });
        res.status(200).json({
            message: "Chat eliminado",
            deletedMessages,
        });
    }
    catch (error) {
        console.error("Error al eliminar el chat:", error);
        res.status(500).json({ error: "Error al eliminar el chat" });
    }
});
exports.deleteChat = deleteChat;
