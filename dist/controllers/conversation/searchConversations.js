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
exports.searchConversations = void 0;
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const searchConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { query } = req.query;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!query) {
        return res.status(400).json({
            success: false,
            message: "El parámetro de búsqueda es requerido",
        });
    }
    try {
        const mensajes = yield MessageModel_1.default.find({
            $or: [
                { from: { $regex: query, $options: "i" } },
                { to: { $regex: query, $options: "i" } },
                { message: { $regex: query, $options: "i" } },
                { possibleName: { $regex: query, $options: "i" } },
            ],
            organization: organizationId,
        })
            .limit(10)
            .sort({ timestamp: -1 });
        return res.status(200).json({
            success: true,
            mensajes,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error al buscar conversaciones",
        });
    }
});
exports.searchConversations = searchConversations;
