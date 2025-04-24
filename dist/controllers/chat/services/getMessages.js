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
exports.getMessages = void 0;
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
        return res.status(401).json({ error: "User not found" });
    }
    const { organizationId, _id: userId } = req.user;
    const { contact, page = "1", limit = "10", direction, type, isRead } = req.query;
    // Validar que se haya proporcionado 'contact' y que sea una cadena no vacía
    if (!contact || typeof contact !== "string" || contact.trim() === "") {
        return res.status(400).json({ error: "Contact is required" });
    }
    // Convertir y validar los parámetros de paginación
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    if (isNaN(pageNumber) || pageNumber < 1) {
        return res.status(400).json({ error: "Page must be a number greater than 0" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
        return res.status(400).json({ error: "Limit must be a number greater than 0" });
    }
    // Construir la consulta base
    const query = {
        organization: organizationId,
        user: userId,
        $or: [{ from: contact }, { to: contact }],
    };
    // Agregar filtros opcionales
    if (direction) {
        query.direction = direction;
    }
    if (type) {
        query.type = type;
    }
    if (isRead !== undefined) {
        query.isRead = isRead === 'true';
    }
    try {
        // Calcular el offset según la página solicitada
        const skipCount = (pageNumber - 1) * limitNumber;
        // Realizar la consulta aplicando paginación y ordenando de más reciente a más antiguo
        const messages = yield MessageModel_1.default.find(query)
            .populate("replyToMessage")
            .sort({ timestamp: 1, _id: 1 })
            .skip(skipCount)
            .limit(limitNumber);
        // Responder con los mensajes y la página actual
        return res.status(200).json(messages);
    }
    catch (error) {
        console.error("Error getting messages:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error occurred",
        });
    }
});
exports.getMessages = getMessages;
