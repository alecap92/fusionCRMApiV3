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
exports.searchChats = void 0;
const ContactModel_1 = __importDefault(require("../../../models/ContactModel"));
const mongoose_1 = __importDefault(require("mongoose"));
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const searchChats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
    }
    const { organizationId } = req.user;
    const { query } = req.query;
    if (!query) {
        return res
            .status(400)
            .json({ message: "La consulta de búsqueda no puede estar vacía" });
    }
    try {
        // Construir la expresión regular para coincidencias amplias (case-insensitive)
        const searchRegex = new RegExp(query, "i");
        // Buscar en mensajes de entrada
        const messagesMatches = yield MessageModel_1.default.aggregate([
            {
                $match: {
                    organization: new mongoose_1.default.Types.ObjectId(organizationId),
                    $or: [
                        { from: { $regex: searchRegex } },
                        { to: { $regex: searchRegex } },
                        { message: { $regex: searchRegex } },
                    ],
                },
            },
            {
                $group: {
                    _id: "$from",
                    lastMessage: { $last: "$message" },
                    lastMessageTime: { $last: "$timestamp" },
                },
            },
        ]);
        const results = yield Promise.all(messagesMatches.map((match) => __awaiter(void 0, void 0, void 0, function* () {
            const contactInfo = yield ContactModel_1.default.findOne({
                organizationId,
                $or: [
                    { "properties.key": "phone", "properties.value": match._id },
                    { "properties.key": "cellphone", "properties.value": match._id },
                ],
            })
                .lean()
                .exec();
            const firstNameProperty = contactInfo === null || contactInfo === void 0 ? void 0 : contactInfo.properties.find((prop) => prop.key === "firstName");
            const lastNameProperty = contactInfo === null || contactInfo === void 0 ? void 0 : contactInfo.properties.find((prop) => prop.key === "lastName");
            const name = `${(firstNameProperty === null || firstNameProperty === void 0 ? void 0 : firstNameProperty.value) || ""} ${(lastNameProperty === null || lastNameProperty === void 0 ? void 0 : lastNameProperty.value) || ""}`.trim();
            return {
                _id: match._id,
                contact: match._id,
                name: name || match._id,
                lastMessage: match.lastMessage,
                lastMessageTime: match.lastMessageTime,
            };
        })));
        res.status(200).json(results);
    }
    catch (error) {
        console.error("Error en la búsqueda de chats:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
});
exports.searchChats = searchChats;
