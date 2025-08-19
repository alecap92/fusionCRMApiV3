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
const mongoose_1 = __importDefault(require("mongoose"));
const ConversationModel_1 = __importDefault(require("../models/ConversationModel"));
const MessageModel_1 = __importDefault(require("../models/MessageModel"));
function fixUnreadCount() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/fusioncrm");
            console.log("Conectado a MongoDB");
            // Obtener todas las conversaciones
            const conversations = yield ConversationModel_1.default.find({});
            console.log(`Encontradas ${conversations.length} conversaciones`);
            let fixedCount = 0;
            for (const conversation of conversations) {
                // Obtener el último mensaje de la conversación
                const lastMessage = yield MessageModel_1.default.findOne({
                    conversation: conversation._id
                }).sort({ timestamp: -1 });
                if (lastMessage) {
                    let shouldUpdate = false;
                    let newUnreadCount = conversation.unreadCount || 0;
                    // Si el último mensaje es saliente, el unreadCount debería ser 0
                    if (lastMessage.direction === "outgoing" && conversation.unreadCount > 0) {
                        newUnreadCount = 0;
                        shouldUpdate = true;
                    }
                    // Si el último mensaje es entrante, verificar si hay mensajes no leídos
                    else if (lastMessage.direction === "incoming") {
                        const unreadIncomingMessages = yield MessageModel_1.default.countDocuments({
                            conversation: conversation._id,
                            direction: "incoming",
                            isRead: false
                        });
                        if (unreadIncomingMessages !== conversation.unreadCount) {
                            newUnreadCount = unreadIncomingMessages;
                            shouldUpdate = true;
                        }
                    }
                    if (shouldUpdate) {
                        yield ConversationModel_1.default.findByIdAndUpdate(conversation._id, {
                            unreadCount: newUnreadCount
                        });
                        console.log(`Conversación ${conversation._id}: unreadCount actualizado de ${conversation.unreadCount} a ${newUnreadCount}`);
                        fixedCount++;
                    }
                }
            }
            console.log(`✅ Script completado. ${fixedCount} conversaciones corregidas.`);
        }
        catch (error) {
            console.error("Error:", error);
        }
        finally {
            yield mongoose_1.default.disconnect();
        }
    });
}
// Ejecutar el script
fixUnreadCount();
