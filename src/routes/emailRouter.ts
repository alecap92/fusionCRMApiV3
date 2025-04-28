// Importaciones
import express from "express";
import { verifyToken } from "../middlewares/authMiddleware";

// Controladores de correos
import {
  fetchEmails,
  fetchEmail,
  sendEmail,
  saveNewEmails,
  deleteEmail,
  updateEmail,
  downloadAttachment,
  fetchEmailByContactId,
} from "../controllers/mail/emailController";

import { syncOldMails } from "../controllers/mail/syncController";

// Controladores de configuración
import {
  configureAccount,
  validateAccount,
} from "../controllers/mail/accountController";

// Controladores de carpetas
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from "../controllers/mail/folderController";

// Controladores de adjuntos
import {
  getAttachment,
  uploadAttachment,
} from "../controllers/mail/attachmentController";

// Controladores avanzados
import {
  bulkEmailOperations,
  getStats,
  pushNotifications,
} from "../controllers/mail/advanceController";
import multer from "multer";

// Router
const router = express.Router();

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10 MB por archivo
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("File type not allowed."));
    }
    cb(null, true);
  },
});

// **/settings**
router.post("/settings/account", verifyToken, configureAccount); // Configurar cuenta IMAP/SMTP
router.post("/settings/validate", verifyToken, validateAccount); // Validar conexión con el servidor

// **/emails**
router.get("/emails/contactId/:contactId", verifyToken, fetchEmailByContactId); // Obtener correos de un contacto
router.get(
  "/emails/:emailId/attachments/:partID",
  verifyToken,
  downloadAttachment
);
router.get("/emails", verifyToken, fetchEmails); // Obtener correos
router.post("/emails/sync", verifyToken, syncOldMails); // Sincronizar correos antiguos
router.post("/emails/new", verifyToken, saveNewEmails); // Guardar nuevos correos
router.get("/emails/:id", verifyToken, fetchEmail); // Obtener detalles de un correo
router.post("/send", verifyToken, upload.array("attachments"), sendEmail); // Enviar un correo
router.delete("/emails/:id", verifyToken, deleteEmail); // Eliminar un correo

router.put("/emails/:id", verifyToken, updateEmail); // Actualizar propiedades de un correo

// **/folders**
router.get("/folders", verifyToken, getFolders); // Obtener carpetas
router.post("/folders", verifyToken, createFolder); // Crear carpeta
router.put("/folders/:id", verifyToken, updateFolder); // Actualizar carpeta
router.delete("/folders/:id", verifyToken, deleteFolder); // Eliminar carpeta

// **/attachments**
router.get("/attachments/:id", verifyToken, getAttachment); // Descargar adjunto
router.post("/attachments", verifyToken, uploadAttachment); // Subir adjunto

// **/advanced**
router.post("/emails/bulk", verifyToken, bulkEmailOperations); // Operaciones masivas
router.get("/stats", verifyToken, getStats); // Obtener estadísticas del correo
router.post("/notifications/push", verifyToken, pushNotifications); // Habilitar notificaciones push

export default router;
