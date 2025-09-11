"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getAllConversationMessages = void 0;
const MessageModel_1 = __importDefault(require("../models/MessageModel"));
/**
 * Obtiene TODOS los mensajes de una conversación, manejando la paginación automáticamente
 * @param conversationId - ID de la conversación
 * @param organizationId - ID de la organización (para seguridad)
 * @returns Promise con todos los mensajes de la conversación
 */
const getAllConversationMessages = (conversationId, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar que la conversación existe y pertenece a la organización
        const conversation = yield Promise.resolve().then(() => __importStar(require("../models/ConversationModel"))).then((module) => module.default);
        const conversationDoc = yield conversation
            .findOne({
            _id: conversationId,
            organization: organizationId,
        })
            .lean();
        if (!conversationDoc) {
            return {
                success: false,
                data: {
                    conversationId,
                    messages: [],
                    totalMessages: 0,
                    conversationInfo: {
                        title: "",
                        participants: {},
                        createdAt: "",
                        updatedAt: "",
                    },
                },
                error: "Conversación no encontrada",
            };
        }
        // Obtener el total de mensajes
        const totalMessages = yield MessageModel_1.default.countDocuments({
            conversation: conversationId,
        });
        // Si no hay mensajes, retornar respuesta vacía
        if (totalMessages === 0) {
            return {
                success: true,
                data: {
                    conversationId,
                    messages: [],
                    totalMessages: 0,
                    conversationInfo: {
                        title: conversationDoc.title,
                        participants: conversationDoc.participants,
                        createdAt: conversationDoc.createdAt.toISOString(),
                        updatedAt: conversationDoc.updatedAt.toISOString(),
                    },
                },
            };
        }
        // Obtener TODOS los mensajes (sin paginación)
        const allMessages = yield MessageModel_1.default.find({ conversation: conversationId })
            .sort({ timestamp: 1 }) // Orden cronológico ascendente
            .lean();
        // Formatear mensajes para el contexto
        const formattedMessages = allMessages.map((msg) => ({
            _id: msg._id,
            from: msg.from,
            to: msg.to,
            message: msg.message,
            mediaUrl: msg.mediaUrl,
            type: msg.type,
            timestamp: msg.timestamp,
            direction: msg.direction,
            isRead: msg.isRead,
            possibleName: msg.possibleName,
            filename: msg.filename,
            mimeType: msg.mimeType,
            latitude: msg.latitude,
            longitude: msg.longitude,
        }));
        return {
            success: true,
            data: {
                conversationId,
                messages: formattedMessages,
                totalMessages,
                conversationInfo: {
                    title: conversationDoc.title,
                    participants: conversationDoc.participants,
                    createdAt: conversationDoc.createdAt.toISOString(),
                    updatedAt: conversationDoc.updatedAt.toISOString(),
                },
            },
        };
    }
    catch (error) {
        console.error("Error obteniendo mensajes de conversación:", error);
        return {
            success: false,
            data: {
                conversationId,
                messages: [],
                totalMessages: 0,
                conversationInfo: {
                    title: "",
                    participants: {},
                    createdAt: "",
                    updatedAt: "",
                },
            },
            error: error instanceof Error ? error.message : "Error desconocido",
        };
    }
});
exports.getAllConversationMessages = getAllConversationMessages;
