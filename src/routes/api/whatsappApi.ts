import { Router } from "express";
import { sendMessage } from "../../controllers/api/WhatsAppApi";

const router: Router = Router();

// 📱 Enviar mensaje de WhatsApp
router.post("/send", sendMessage);

export default router;
