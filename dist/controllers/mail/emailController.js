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
exports.fetchEmailByContactId = exports.downloadAttachment = exports.updateEmail = exports.deleteEmail = exports.saveNewEmails = exports.sendEmail = exports.fetchEmail = exports.fetchEmails = void 0;
const EmailModel_1 = __importDefault(require("../../models/EmailModel"));
const UserModel_1 = __importDefault(require("../../models/UserModel"));
const smtpClient_1 = require("../../utils/smtpClient");
const imapClient_1 = require("../../utils/imapClient");
const imap_simple_1 = __importDefault(require("imap-simple"));
/**
 * Lista los correos electrónicos de un usuario.
 */
const fetchEmails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { offset = 0, limit = 10, folder = "inbox" } = req.query;
        const emails = yield EmailModel_1.default.find({ userId })
            .populate("contactId")
            .skip(Number(offset))
            .limit(Number(limit))
            .sort({ date: -1 });
        res.status(200).json(emails);
    }
    catch (error) {
        console.error("Error fetching emails:", error);
        res.status(500).json({ error: "Failed to fetch emails." });
    }
});
exports.fetchEmails = fetchEmails;
/**
 * Obtiene los detalles de un correo específico.
 */
const fetchEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const email = yield EmailModel_1.default.findOne({ _id: id, userId }).populate("contactId");
        if (!email) {
            return res.status(404).json({ error: "Email not found." });
        }
        res.status(200).json(email);
    }
    catch (error) {
        console.error("Error fetching email:", error);
        res.status(500).json({ error: "Failed to fetch email." });
    }
});
exports.fetchEmail = fetchEmail;
/**
 * Envía un correo electrónico a través de SMTP.
 */
const sendEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = yield UserModel_1.default.findOne({ _id: userId }).select("emailSettings");
        if (!((_b = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _b === void 0 ? void 0 : _b.smtpSettings)) {
            return res
                .status(400)
                .json({ error: "SMTP settings not found for user." });
        }
        // Leer y parsear los campos del form-data
        let to = [];
        if (typeof req.body.to === "string") {
            try {
                to = JSON.parse(req.body.to);
            }
            catch (_d) {
                to = [req.body.to];
            }
        }
        else if (Array.isArray(req.body.to)) {
            to = req.body.to;
        }
        const subject = (_c = req.body.subject) === null || _c === void 0 ? void 0 : _c.toString();
        const content = req.body.content;
        if (!to.length || !subject || !content) {
            return res.status(400).json({
                error: "Recipient (to), subject, and content are required.",
            });
        }
        // Procesar adjuntos desde req.files (Multer)
        let attachments = [];
        if (req.files && Array.isArray(req.files)) {
            attachments = req.files.map((file) => ({
                filename: file.originalname,
                content: file.buffer,
            }));
        }
        else if (req.files && typeof req.files === "object") {
            // Si usas upload.fields([{ name: 'attachments' }])
            const filesArray = req.files["attachments"];
            if (Array.isArray(filesArray)) {
                attachments = filesArray.map((file) => ({
                    filename: file.originalname,
                    content: file.buffer,
                }));
            }
        }
        const result = yield (0, smtpClient_1.sendEmailViaSMTP)(user.emailSettings.smtpSettings, {
            to: to.join(","), // nodemailer espera string separado por comas
            subject,
            html: content,
            attachments,
        });
        res.status(200).json({
            message: "Email sent successfully.",
            result,
        });
    }
    catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email." });
    }
});
exports.sendEmail = sendEmail;
/**
 * Guarda nuevos correos electrónicos en la base de datos.
 */
const saveNewEmails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const newEmails = req.body.emails;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!Array.isArray(newEmails) || newEmails.length === 0) {
            return res.status(400).json({ error: "No emails provided." });
        }
        // Guardar solo los correos que no existen en la base de datos
        const savedEmails = yield Promise.all(newEmails.map((email) => __awaiter(void 0, void 0, void 0, function* () {
            const existingEmail = yield EmailModel_1.default.findOne({
                userId,
                uid: email.uid,
            });
            if (!existingEmail) {
                return EmailModel_1.default.create(Object.assign(Object.assign({}, email), { userId }));
            }
            return null;
        })));
        res.status(200).json({
            message: "Emails processed and saved successfully.",
            savedEmails: savedEmails.filter((email) => email !== null),
        });
    }
    catch (error) {
        console.error("Error saving new emails:", error);
        res.status(500).json({ error: "Failed to save emails." });
    }
});
exports.saveNewEmails = saveNewEmails;
/**
 * Elimina un correo electrónico desde la base de datos y opcionalmente del servidor IMAP.
 */
const deleteEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Buscar el correo en la base de datos
        const email = yield EmailModel_1.default.findOne({ _id: id, userId });
        if (!email) {
            return res.status(404).json({ error: "Email not found." });
        }
        // Opcional: Eliminar el correo del servidor IMAP
        const imapResult = yield (0, imapClient_1.deleteEmailFromServer)(userId, email.uid);
        // Eliminar el correo de la base de datos
        yield EmailModel_1.default.findByIdAndDelete(id);
        res.status(200).json({
            message: "Email deleted successfully.",
            imapResult,
        });
    }
    catch (error) {
        console.error("Error deleting email:", error);
        res.status(500).json({ error: "Failed to delete email." });
    }
});
exports.deleteEmail = deleteEmail;
/**
 * Actualiza un correo (por ejemplo, marcar como leído/no leído).
 */
const updateEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { id } = req.params;
        const updates = req.body;
        console.log(id, updates);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const email = yield EmailModel_1.default.findOneAndUpdate({ _id: id, userId }, updates, { new: true });
        if (!email) {
            return res.status(404).json({ error: "Email not found." });
        }
        res.status(200).json({ message: "Email updated successfully.", email });
    }
    catch (error) {
        console.error("Error updating email:", error);
        res.status(500).json({ error: "Failed to update email." });
    }
});
exports.updateEmail = updateEmail;
/**
 * Descarga un adjunto específico.
 */
const downloadAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { emailId, partID } = req.params;
        console.log("Request received for downloading attachment:", {
            userId,
            emailId,
            partID,
        });
        if (!userId) {
            console.error("Unauthorized access attempt.");
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Buscar el correo en la base de datos
        const email = yield EmailModel_1.default.findOne({ _id: emailId, userId });
        if (!email) {
            console.error("Email not found:", { emailId });
            return res.status(404).json({ error: "Email not found." });
        }
        console.log("Email found:", { emailId, uid: email.uid });
        // Buscar el adjunto en el correo
        const attachment = (_b = email.attachments) === null || _b === void 0 ? void 0 : _b.find((att) => att.partID === partID);
        if (!attachment) {
            console.error("Attachment not found in email:", { emailId, partID });
            return res.status(404).json({ error: "Attachment not found." });
        }
        console.log("Attachment metadata found:", attachment);
        // Obtener las configuraciones IMAP del usuario
        const user = yield UserModel_1.default.findOne({ _id: userId }).select("emailSettings");
        if (!((_c = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _c === void 0 ? void 0 : _c.imapSettings)) {
            console.error("IMAP settings not found for user:", { userId });
            return res
                .status(400)
                .json({ error: "IMAP settings not found for user." });
        }
        console.log("IMAP settings found for user.");
        // Conectar al servidor IMAP
        const connection = yield imap_simple_1.default.connect({
            imap: Object.assign(Object.assign({}, user.emailSettings.imapSettings), { authTimeout: 10000 }),
        });
        console.log("IMAP connection established.");
        yield connection.openBox("INBOX");
        console.log("INBOX opened successfully.");
        // Buscar el mensaje en el servidor IMAP
        const message = yield connection.search([["UID", email.uid.toString()]], {
            bodies: [""],
            struct: true,
        });
        console.log("Message retrieved from IMAP server:", message);
        if (!message.length) {
            console.error("No message found for UID:", email.uid);
            yield connection.end();
            return res
                .status(404)
                .json({ error: "Message not found on IMAP server." });
        }
        // Obtener la estructura del mensaje
        const part = ((_e = (_d = message[0]) === null || _d === void 0 ? void 0 : _d.attributes) === null || _e === void 0 ? void 0 : _e.struct)
            ? message[0].attributes.struct
                .flat(10)
                .find((p) => {
                var _a, _b, _c;
                return p.partID === attachment.partID ||
                    ((_a = p.id) === null || _a === void 0 ? void 0 : _a.includes(attachment.partID)) ||
                    (((_c = (_b = p.disposition) === null || _b === void 0 ? void 0 : _b.params) === null || _c === void 0 ? void 0 : _c.filename) === attachment.filename &&
                        p.type === "application");
            })
            : undefined;
        if (!part) {
            console.error("Attachment part not found in message structure or message structure is undefined.", { partID, attachment });
            yield connection.end();
            return res.status(404).json({ error: "Attachment part not found." });
        }
        console.log("Resolved part for attachment:", part);
        // Descargar el adjunto
        const attachmentStream = yield connection.getPartData(message[0], part);
        console.log("Attachment downloaded successfully.");
        // Finalizar la conexión
        yield connection.end();
        console.log("IMAP connection closed.");
        // Enviar el adjunto al cliente
        res.setHeader("Content-Type", attachment.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${attachment.filename}"`);
        res.send(attachmentStream);
        console.log("Attachment sent to client.");
    }
    catch (error) {
        console.error("Error downloading attachment:", error);
        res.status(500).json({ error: "Failed to download attachment." });
    }
});
exports.downloadAttachment = downloadAttachment;
const fetchEmailByContactId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { contactId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const emails = yield EmailModel_1.default.find({ userId, contactId });
        res.status(200).json(emails);
    }
    catch (error) {
        console.error("Error fetching emails by contact ID:", error);
        res.status(500).json({ error: "Failed to fetch emails." });
    }
});
exports.fetchEmailByContactId = fetchEmailByContactId;
