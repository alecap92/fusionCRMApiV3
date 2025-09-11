import { Router } from "express";
import { verifyApiToken } from "../middlewares/authApiMiddleware";
import contactsApiRouter from "./api/contactsApi";
import dealsApiRouter from "./api/dealsApi";
import whatsappApiRouter from "./api/whatsappApi";
import quotationsApiRouter from "./api/quotationsApi";
import tokenApiRouter from "./api/tokenApi";

const router: Router = Router();

// Ruta para gestión de tokens (requiere autenticación de usuario, no API)
router.use("/tokens", tokenApiRouter);

// Middleware de autenticación para todas las rutas de API
router.use(verifyApiToken);

// Rutas de la API organizadas (protegidas con token de API)
router.use("/contacts", contactsApiRouter);
router.use("/deals", dealsApiRouter);
router.use("/whatsapp", whatsappApiRouter);
router.use("/quotations", quotationsApiRouter);

export default router;
