import { Router } from "express";

import { verifyToken } from "../middlewares/authMiddleware";
import { verifyWebhook } from "../controllers/chat/services/verifyWebHook";
import { handleWebhook } from "../controllers/chat/services/handleWebHook";
import { sendCustomMessage } from "../controllers/chat/services/sendCustomMessage";
import { getMessages } from "../controllers/chat/services/getMessages";
import { getChatList } from "../controllers/chat/services/getChatList";
import { searchChats } from "../controllers/chat/services/searchChat";
import { getTemplatesMessages } from "../controllers/chat/services/getTemplateMessages";
import { markMessagesAsRead } from "../controllers/chat/services/markMessageAsRead";
import { sendTemplateMessage } from "../controllers/chat/services/sendTemplateMessage";
import { deleteChat } from "../controllers/chat/services/deleteChat";
import chatGPT from "../controllers/chat/services/chatGPTController";
import { getChatsByContactId } from "../controllers/chat/services/getChatsByContactId";
import multer from "multer";

const router: Router = Router();

const upload = multer();

router.get("/byContactId/:contactId", verifyToken, getChatsByContactId); // Trae un chat por
router.get("/webhook", verifyWebhook); // Verifica la conexion del webhook con facebook
router.get("/messages", verifyToken, getMessages); // Verifica de un contacto, los mensajes paginados
router.get("/chat-list", verifyToken, getChatList); // Verifica los chat-list (lista de chats)
router.post("/send", verifyToken, upload.single("file"), sendCustomMessage); // Se encarga de enviar los mensajes con todos sus tipos
router.get("/search", verifyToken, searchChats); // Se encarga de la busqueda en chatlist
router.put("/mark-as-read", verifyToken, markMessagesAsRead); // Marca los mensajes como leidos del chatlist
router.get("/templates", verifyToken, getTemplatesMessages); // Trae los templates de la cuenta
router.post("/send-template", verifyToken, sendTemplateMessage); // Envia un mensaje con plantilla, desde detalle de contacto
router.post("/webhook", handleWebhook); // Maneja los mensajes que llegan desde facebook
router.delete("/delete/:id", verifyToken, deleteChat); // Elimina un chat de la lista de chats
router.post("/gpt", verifyToken, chatGPT);
export default router;
