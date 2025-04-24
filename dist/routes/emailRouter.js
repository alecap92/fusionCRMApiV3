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
router.post("/settings/account", authMiddleware_1.verifyToken, accountController_1.configureAccount); // Configurar cuenta IMAP/SMTP
router.post("/settings/validate", authMiddleware_1.verifyToken, accountController_1.validateAccount); // Validar conexión con el servidor
// **/emails**
router.get("/emails/contactId/:contactId", authMiddleware_1.verifyToken, emailController_1.fetchEmailByContactId); // Obtener correos de un contacto
router.get("/emails/:emailId/attachments/:partID", authMiddleware_1.verifyToken, emailController_1.downloadAttachment);
router.get("/emails", authMiddleware_1.verifyToken, emailController_1.fetchEmails); // Obtener correos
router.post("/emails/sync", authMiddleware_1.verifyToken, syncController_1.syncOldMails); // Sincronizar correos antiguos
router.post("/emails/new", authMiddleware_1.verifyToken, emailController_1.saveNewEmails); // Guardar nuevos correos
router.get("/emails/:id", authMiddleware_1.verifyToken, emailController_1.fetchEmail); // Obtener detalles de un correo
router.post("/emails", authMiddleware_1.verifyToken, upload.array("attachments"), emailController_1.sendEmail); // Enviar un correo
router.delete("/emails/:id", authMiddleware_1.verifyToken, emailController_1.deleteEmail); // Eliminar un correo
router.put("/emails/:id", authMiddleware_1.verifyToken, emailController_1.updateEmail); // Actualizar propiedades de un correo
// **/folders**
router.get("/folders", authMiddleware_1.verifyToken, folderController_1.getFolders); // Obtener carpetas
router.post("/folders", authMiddleware_1.verifyToken, folderController_1.createFolder); // Crear carpeta
router.put("/folders/:id", authMiddleware_1.verifyToken, folderController_1.updateFolder); // Actualizar carpeta
router.delete("/folders/:id", authMiddleware_1.verifyToken, folderController_1.deleteFolder); // Eliminar carpeta
// **/attachments**
router.get("/attachments/:id", authMiddleware_1.verifyToken, attachmentController_1.getAttachment); // Descargar adjunto
router.post("/attachments", authMiddleware_1.verifyToken, attachmentController_1.uploadAttachment); // Subir adjunto
// **/advanced**
router.post("/emails/bulk", authMiddleware_1.verifyToken, advanceController_1.bulkEmailOperations); // Operaciones masivas
router.get("/stats", authMiddleware_1.verifyToken, advanceController_1.getStats); // Obtener estadísticas del correo
router.post("/notifications/push", authMiddleware_1.verifyToken, advanceController_1.pushNotifications); // Habilitar notificaciones push
exports.default = router;
