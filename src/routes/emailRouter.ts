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
  getAccountSettings,
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
router.get("/settings/account", verifyToken, getAccountSettings); // Obtener configuración actual
router.post("/settings/account", verifyToken, configureAccount); // Configurar cuenta IMAP/SMTP
router.post("/settings/validate", verifyToken, validateAccount); // Validar conexión con el servidor

// **Ruta temporal para probar eventos de socket (debe ir antes que otras rutas)**
// router.post("/emails/test-socket", verifyToken, testNewEmailSocket); // Eliminada - función de depuración

// **/ (emails) - Rutas principales de correos**
router.get("/", verifyToken, fetchEmails); // Obtener correos con filtros
router.post("/send", verifyToken, upload.array("attachments"), sendEmail); // Enviar un correo
router.post("/search", verifyToken, fetchEmails); // Búsqueda de correos (usar mismo controlador con query)
router.post("/bulk", verifyToken, bulkEmailOperations); // Operaciones masivas

// **Rutas directas para correos individuales (compatibilidad con frontend)**
router.get("/:id", verifyToken, fetchEmail); // Obtener detalles de un correo
router.delete("/:id", verifyToken, deleteEmail); // Eliminar un correo
router.put("/:id", verifyToken, updateEmail); // Actualizar propiedades de un correo
router.patch("/:id/read", verifyToken, updateEmail); // Marcar como leído
router.patch("/:id/star", verifyToken, updateEmail); // Marcar como favorito
router.patch("/:id/important", verifyToken, updateEmail); // Marcar como importante
router.patch("/:id/folder", verifyToken, updateEmail); // Mover a carpeta
router.patch("/:id/labels/add", verifyToken, updateEmail); // Añadir etiqueta
router.patch("/:id/labels/remove", verifyToken, updateEmail); // Eliminar etiqueta
router.get("/:id/attachments/:partID", verifyToken, downloadAttachment); // Descargar adjunto

// **/emails** - Rutas específicas de correos (mantener para compatibilidad)
router.get("/emails/contactId/:contactId", verifyToken, fetchEmailByContactId); // Obtener correos de un contacto
router.get(
  "/emails/:emailId/attachments/:partID",
  verifyToken,
  downloadAttachment
);
router.post("/emails/sync", verifyToken, syncOldMails); // Sincronizar correos antiguos
router.post("/emails/new", verifyToken, saveNewEmails); // Guardar nuevos correos
router.get("/emails/:id", verifyToken, fetchEmail); // Obtener detalles de un correo
router.delete("/emails/:id", verifyToken, deleteEmail); // Eliminar un correo
router.put("/emails/:id", verifyToken, updateEmail); // Actualizar propiedades de un correo

// Rutas específicas para operaciones de correos individuales
router.patch("/emails/:id/read", verifyToken, updateEmail); // Marcar como leído
router.patch("/emails/:id/star", verifyToken, updateEmail); // Marcar como favorito
router.patch("/emails/:id/important", verifyToken, updateEmail); // Marcar como importante
router.patch("/emails/:id/folder", verifyToken, updateEmail); // Mover a carpeta
router.patch("/emails/:id/labels/add", verifyToken, updateEmail); // Añadir etiqueta
router.patch("/emails/:id/labels/remove", verifyToken, updateEmail); // Eliminar etiqueta

// **/folders**
router.get("/folders", verifyToken, getFolders); // Obtener carpetas
router.post("/folders", verifyToken, createFolder); // Crear carpeta
router.put("/folders", verifyToken, updateFolder); // Actualizar carpeta (cambiar a PUT sin ID)
router.delete("/folders", verifyToken, deleteFolder); // Eliminar carpeta

// **/labels** - Rutas para etiquetas
router.get("/labels", verifyToken, (req, res) => {
  // Por ahora retornar array vacío hasta implementar controlador completo
  res.json([]);
});
router.post("/labels", verifyToken, (req, res) => {
  res.status(501).json({ message: "Labels creation not implemented yet" });
});
router.put("/labels/:id", verifyToken, (req, res) => {
  res.status(501).json({ message: "Labels update not implemented yet" });
});
router.delete("/labels/:id", verifyToken, (req, res) => {
  res.status(501).json({ message: "Labels deletion not implemented yet" });
});

// **/threads** - Rutas para hilos de conversación
router.get("/threads", verifyToken, (req, res) => {
  res.json([]);
});
router.get("/threads/:id", verifyToken, (req, res) => {
  res.status(404).json({ message: "Thread not found" });
});

// **/attachments**
router.get("/attachments/:id", verifyToken, getAttachment); // Descargar adjunto
router.post("/attachments", verifyToken, uploadAttachment); // Subir adjunto

// **/stats** - Estadísticas
router.get("/stats", verifyToken, getStats); // Obtener estadísticas del correo
router.get("/stats/storage", verifyToken, (req, res) => {
  res.json({ used: 0, total: 1000000000, percentage: 0 });
});

// **/sync** - Sincronización
router.post("/sync/old", verifyToken, syncOldMails);
router.post("/sync/force", verifyToken, syncOldMails);
router.get("/sync/status", verifyToken, (req, res) => {
  res.json({
    isActive: false,
    lastSync: new Date().toISOString(),
    nextSync: new Date(Date.now() + 3600000).toISOString(),
  });
});

// **/notifications**
router.post("/notifications/push", verifyToken, pushNotifications); // Habilitar notificaciones push

// **/export** - Exportación
router.post("/export", verifyToken, (req, res) => {
  res.status(501).json({ message: "Export not implemented yet" });
});

// **/queue** - Información de colas
router.get("/queue/stats", verifyToken, (req, res) => {
  res.json({ processing: 0, waiting: 0, completed: 0, failed: 0 });
});

export default router;
