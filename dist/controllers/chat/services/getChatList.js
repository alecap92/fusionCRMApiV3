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
exports.getChatList = void 0;
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const OrganizationModel_1 = __importDefault(require("../../../models/OrganizationModel"));
const ContactModel_1 = __importDefault(require("../../../models/ContactModel"));
const mongoose_1 = require("mongoose");
/**
 * Enriquecer la lista de chats con información del contacto
 * @param chatList - Lista de chats obtenida desde la base de datos
 * @param organizationId - ID de la organización del usuario autenticado
 * @returns Lista de chats con información enriquecida
 */
const enrichChatList = (chatList, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    return Promise.all(chatList.map((chat) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
            const contactInfo = yield ContactModel_1.default.findOne({
                organizationId,
                $or: [{ "properties.key": "mobile", "properties.value": chat._id }],
            }).lean();
            const name = [
                (_a = contactInfo === null || contactInfo === void 0 ? void 0 : contactInfo.properties.find((prop) => prop.key === "firstName")) === null || _a === void 0 ? void 0 : _a.value,
                (_b = contactInfo === null || contactInfo === void 0 ? void 0 : contactInfo.properties.find((prop) => prop.key === "lastName")) === null || _b === void 0 ? void 0 : _b.value,
            ]
                .filter(Boolean)
                .join(" ");
            return {
                _id: (_c = chat.lastMessage) === null || _c === void 0 ? void 0 : _c._id,
                contact: chat._id,
                name: name || chat._id,
                contactId: contactInfo === null || contactInfo === void 0 ? void 0 : contactInfo._id,
                lastMessage: (_d = chat.lastMessage) === null || _d === void 0 ? void 0 : _d.message,
                lastMessageTime: ((_e = chat.lastMessage) === null || _e === void 0 ? void 0 : _e.timestamp)
                    ? new Date(chat.lastMessage.timestamp).getTime()
                    : 0,
                unreadCount: chat.unreadCount,
                possibleName: (_f = chat.lastMessage) === null || _f === void 0 ? void 0 : _f.possibleName,
            };
        }
        catch (error) {
            console.error(`Error obteniendo información del contacto ${chat._id}:`, error);
            return null;
        }
    })));
});
/**
 * Obtiene la lista de chats de la organización
 * @param req - Request de Express
 * @param res - Response de Express
 */
const getChatList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
    }
    const { search, limit = "10", page = "1" } = req.query;
    const searchQuery = search;
    const organizationId = req.user.organizationId;
    try {
        // Si hay un término de búsqueda, ejecutar búsqueda y devolver resultados
        // Convertir y validar los parámetros de paginación
        const limitNum = Math.max(parseInt(limit, 10), 1);
        const pageNum = Math.max(parseInt(page, 10), 1);
        const offset = (pageNum - 1) * limitNum;
        // Obtener el número de WhatsApp de la organización
        const organization = yield OrganizationModel_1.default.findById(organizationId)
            .lean()
            .exec();
        if (!((_b = (_a = organization === null || organization === void 0 ? void 0 : organization.settings) === null || _a === void 0 ? void 0 : _a.whatsapp) === null || _b === void 0 ? void 0 : _b.phoneNumber)) {
            return res.status(400).json({
                message: "Número de WhatsApp de la organización no encontrado",
            });
        }
        const userPhoneNumber = organization.settings.whatsapp.phoneNumber;
        const chatList = yield MessageModel_1.default.aggregate([
            {
                $match: {
                    organization: new mongoose_1.Types.ObjectId(organizationId),
                    $or: [
                        {
                            from: searchQuery
                                ? { $regex: searchQuery, $options: "i" }
                                : userPhoneNumber,
                        },
                        {
                            to: searchQuery
                                ? { $regex: searchQuery, $options: "i" }
                                : userPhoneNumber,
                        },
                    ],
                },
            },
            {
                $addFields: {
                    contact: {
                        $cond: {
                            if: { $eq: ["$from", userPhoneNumber] },
                            then: "$to",
                            else: "$from",
                        },
                    },
                },
            },
            {
                $group: {
                    _id: "$contact",
                    lastMessage: { $last: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$to", userPhoneNumber] },
                                        { $eq: ["$isRead", false] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { "lastMessage.timestamp": -1 } },
            { $skip: offset },
            { $limit: limitNum },
        ]);
        // Enriquecer la lista de chats con información del contacto
        const enrichedChatList = yield enrichChatList(chatList, organizationId);
        if (!enrichedChatList) {
            return res.status(404).json({ message: "No se encontraron chats" });
        }
        return res.status(200).json(enrichedChatList.filter(Boolean));
    }
    catch (error) {
        console.error("Error obteniendo la lista de chats:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
});
exports.getChatList = getChatList;
