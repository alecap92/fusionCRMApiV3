"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Importaciones
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
// Controladores de correos
const emailController_1 = require("../controllers/mail/emailController");
const syncController_1 = require("../controllers/mail/syncController");
// Controladores de configuración
const accountController_1 = require("../controllers/mail/accountController");
// Controladores de carpetas
const folderController_1 = require("../controllers/mail/folderController");
// Controladores de adjuntos
const attachmentController_1 = require("../controllers/mail/attachmentController");
// Controladores avanzados
const advanceController_1 = require("../controllers/mail/advanceController");
const multer_1 = __importDefault(require("multer"));
// Router
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
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
router.get("/settings/account", authMiddleware_1.verifyToken, accountController_1.getAccountSettings); // Obtener configuración actual
router.post("/settings/account", authMiddleware_1.verifyToken, accountController_1.configureAccount); // Configurar cuenta IMAP/SMTP
router.post("/settings/validate", authMiddleware_1.verifyToken, accountController_1.validateAccount); // Validar conexión con el servidor
// **Ruta temporal para probar eventos de socket (debe ir antes que otras rutas)**
// router.post("/emails/test-socket", verifyToken, testNewEmailSocket); // Eliminada - función de depuración
// **/ (emails) - Rutas principales de correos**
router.get("/", authMiddleware_1.verifyToken, emailController_1.fetchEmails); // Obtener correos con filtros
router.post("/send", authMiddleware_1.verifyToken, upload.array("attachments"), emailController_1.sendEmail); // Enviar un correo
router.post("/search", authMiddleware_1.verifyToken, emailController_1.fetchEmails); // Búsqueda de correos (usar mismo controlador con query)
router.post("/bulk", authMiddleware_1.verifyToken, advanceController_1.bulkEmailOperations); // Operaciones masivas
// **Rutas directas para correos individuales (compatibilidad con frontend)**
router.get("/:id", authMiddleware_1.verifyToken, emailController_1.fetchEmail); // Obtener detalles de un correo
router.delete("/:id", authMiddleware_1.verifyToken, emailController_1.deleteEmail); // Eliminar un correo
router.put("/:id", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Actualizar propiedades de un correo
router.patch("/:id/read", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Marcar como leído
router.patch("/:id/star", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Marcar como favorito
router.patch("/:id/important", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Marcar como importante
router.patch("/:id/folder", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Mover a carpeta
router.patch("/:id/labels/add", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Añadir etiqueta
router.patch("/:id/labels/remove", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Eliminar etiqueta
router.get("/:id/attachments/:partID", authMiddleware_1.verifyToken, emailController_1.downloadAttachment); // Descargar adjunto
// **/emails** - Rutas específicas de correos (mantener para compatibilidad)
router.get("/emails/contactId/:contactId", authMiddleware_1.verifyToken, emailController_1.fetchEmailByContactId); // Obtener correos de un contacto
router.get("/emails/:emailId/attachments/:partID", authMiddleware_1.verifyToken, emailController_1.downloadAttachment);
router.post("/emails/sync", authMiddleware_1.verifyToken, syncController_1.syncOldMails); // Sincronizar correos antiguos
router.post("/emails/new", authMiddleware_1.verifyToken, emailController_1.saveNewEmails); // Guardar nuevos correos
router.get("/emails/:id", authMiddleware_1.verifyToken, emailController_1.fetchEmail); // Obtener detalles de un correo
router.delete("/emails/:id", authMiddleware_1.verifyToken, emailController_1.deleteEmail); // Eliminar un correo
router.put("/emails/:id", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Actualizar propiedades de un correo
// Rutas específicas para operaciones de correos individuales
router.patch("/emails/:id/read", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Marcar como leído
router.patch("/emails/:id/star", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Marcar como favorito
router.patch("/emails/:id/important", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Marcar como importante
router.patch("/emails/:id/folder", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Mover a carpeta
router.patch("/emails/:id/labels/add", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Añadir etiqueta
router.patch("/emails/:id/labels/remove", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Eliminar etiqueta
// **/folders**
router.get("/folders", authMiddleware_1.verifyToken, folderController_1.getFolders); // Obtener carpetas
router.post("/folders", authMiddleware_1.verifyToken, folderController_1.createFolder); // Crear carpeta
router.put("/folders", authMiddleware_1.verifyToken, folderController_1.updateFolder); // Actualizar carpeta (cambiar a PUT sin ID)
router.delete("/folders", authMiddleware_1.verifyToken, folderController_1.deleteFolder); // Eliminar carpeta
// **/labels** - Rutas para etiquetas
router.get("/labels", authMiddleware_1.verifyToken, (req, res) => {
    // Por ahora retornar array vacío hasta implementar controlador completo
    res.json([]);
});
router.post("/labels", authMiddleware_1.verifyToken, (req, res) => {
    res.status(501).json({ message: "Labels creation not implemented yet" });
});
router.put("/labels/:id", authMiddleware_1.verifyToken, (req, res) => {
    res.status(501).json({ message: "Labels update not implemented yet" });
});
router.delete("/labels/:id", authMiddleware_1.verifyToken, (req, res) => {
    res.status(501).json({ message: "Labels deletion not implemented yet" });
});
// **/threads** - Rutas para hilos de conversación
router.get("/threads", authMiddleware_1.verifyToken, (req, res) => {
    res.json([]);
});
router.get("/threads/:id", authMiddleware_1.verifyToken, (req, res) => {
    res.status(404).json({ message: "Thread not found" });
});
// **/attachments**
router.get("/attachments/:id", authMiddleware_1.verifyToken, attachmentController_1.getAttachment); // Descargar adjunto
router.post("/attachments", authMiddleware_1.verifyToken, attachmentController_1.uploadAttachment); // Subir adjunto
// **/stats** - Estadísticas
router.get("/stats", authMiddleware_1.verifyToken, advanceController_1.getStats); // Obtener estadísticas del correo
router.get("/stats/storage", authMiddleware_1.verifyToken, (req, res) => {
    res.json({ used: 0, total: 1000000000, percentage: 0 });
});
// **/sync** - Sincronización
router.post("/sync/old", authMiddleware_1.verifyToken, syncController_1.syncOldMails);
router.post("/sync/force", authMiddleware_1.verifyToken, syncController_1.syncOldMails);
router.get("/sync/status", authMiddleware_1.verifyToken, (req, res) => {
    res.json({
        isActive: false,
        lastSync: new Date().toISOString(),
        nextSync: new Date(Date.now() + 3600000).toISOString(),
    });
});
// **/notifications**
router.post("/notifications/push", authMiddleware_1.verifyToken, advanceController_1.pushNotifications); // Habilitar notificaciones push
// **/export** - Exportación
router.post("/export", authMiddleware_1.verifyToken, (req, res) => {
    res.status(501).json({ message: "Export not implemented yet" });
});
// **/queue** - Información de colas
router.get("/queue/stats", authMiddleware_1.verifyToken, (req, res) => {
    res.json({ processing: 0, waiting: 0, completed: 0, failed: 0 });
});
exports.default = router;
