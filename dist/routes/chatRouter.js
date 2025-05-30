"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const verifyWebHook_1 = require("../controllers/chat/services/verifyWebHook");
const handleWebHook_1 = require("../controllers/chat/services/handleWebHook");
const sendCustomMessage_1 = require("../controllers/chat/services/sendCustomMessage");
const getMessages_1 = require("../controllers/chat/services/getMessages");
const getChatList_1 = require("../controllers/chat/services/getChatList");
const searchChat_1 = require("../controllers/chat/services/searchChat");
const getTemplateMessages_1 = require("../controllers/chat/services/getTemplateMessages");
const markMessageAsRead_1 = require("../controllers/chat/services/markMessageAsRead");
const sendTemplateMessage_1 = require("../controllers/chat/services/sendTemplateMessage");
const deleteChat_1 = require("../controllers/chat/services/deleteChat");
const chatGPTController_1 = __importDefault(require("../controllers/chat/services/chatGPTController"));
const getChatsByContactId_1 = require("../controllers/chat/services/getChatsByContactId");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)();
router.get("/byContactId/:contactId", authMiddleware_1.verifyToken, getChatsByContactId_1.getChatsByContactId); // Trae un chat por
router.get("/webhook", verifyWebHook_1.verifyWebhook); // Verifica la conexion del webhook con facebook
router.get("/messages", authMiddleware_1.verifyToken, getMessages_1.getMessages); // Verifica de un contacto, los mensajes paginados
router.get("/chat-list", authMiddleware_1.verifyToken, getChatList_1.getChatList); // Verifica los chat-list (lista de chats)
router.post("/send", authMiddleware_1.verifyToken, upload.single("file"), sendCustomMessage_1.sendCustomMessage); // Se encarga de enviar los mensajes con todos sus tipos
router.get("/search", authMiddleware_1.verifyToken, searchChat_1.searchChats); // Se encarga de la busqueda en chatlist
router.put("/mark-as-read", authMiddleware_1.verifyToken, markMessageAsRead_1.markMessagesAsRead); // Marca los mensajes como leidos del chatlist
router.get("/templates", authMiddleware_1.verifyToken, getTemplateMessages_1.getTemplatesMessages); // Trae los templates de la cuenta
router.post("/send-template", authMiddleware_1.verifyToken, sendTemplateMessage_1.sendTemplateMessage); // Envia un mensaje con plantilla, desde detalle de contacto
router.post("/webhook", handleWebHook_1.handleWebhook); // Maneja los mensajes que llegan desde facebook
router.delete("/delete/:id", authMiddleware_1.verifyToken, deleteChat_1.deleteChat); // Elimina un chat de la lista de chats
router.post("/gpt", authMiddleware_1.verifyToken, chatGPTController_1.default);
exports.default = router;
