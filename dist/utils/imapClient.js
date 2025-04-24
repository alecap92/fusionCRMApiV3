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
exports.deleteEmailFromServer = exports.syncOldEmails = exports.closeAllConnections = exports.listenForNewEmails = exports.validateUserEmailSettings = exports.validateEmailSettings = void 0;
const imap_simple_1 = __importDefault(require("imap-simple"));
const mailparser_1 = require("mailparser");
const EmailModel_1 = __importDefault(require("../models/EmailModel"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const activeConnections = new Map();
/**
 * Valida las configuraciones de IMAP y SMTP proporcionadas.
 */
const validateEmailSettings = (_a) => __awaiter(void 0, [_a], void 0, function* ({ emailAddress, imapSettings, smtpSettings, }) {
    var _b;
    try {
        // Validar conexión IMAP
        const imapValidation = yield imap_simple_1.default
            .connect({
            imap: Object.assign(Object.assign({}, imapSettings), { tls: (_b = imapSettings.tls) !== null && _b !== void 0 ? _b : true, authTimeout: 10000 }),
        })
            .then((connection) => __awaiter(void 0, void 0, void 0, function* () {
            yield connection.openBox("INBOX");
            yield connection.end();
            return { status: "success", message: "IMAP connection successful." };
        }))
            .catch((error) => ({
            status: "error",
            message: error.message.includes("timeout")
                ? "IMAP connection timed out."
                : "IMAP authentication failed.",
        }));
        // Validar conexión SMTP
        const smtpValidation = yield new Promise((resolve) => {
            const transporter = nodemailer_1.default.createTransport({
                host: smtpSettings.host,
                port: smtpSettings.port,
                secure: smtpSettings.secure,
                auth: { user: smtpSettings.user, pass: smtpSettings.password },
                connectionTimeout: 10000,
            });
            transporter
                .sendMail({
                from: smtpSettings.user,
                to: emailAddress,
                subject: "SMTP Test",
                text: "Testing SMTP configuration.",
            })
                .then(() => resolve({ status: "success", message: "SMTP connection successful." }))
                .catch((error) => resolve({
                status: "error",
                message: error.message.includes("Connection timed out")
                    ? "SMTP connection timed out."
                    : "SMTP authentication failed.",
            }));
        });
        return { imap: imapValidation, smtp: smtpValidation };
    }
    catch (error) {
        console.error("Error validating email settings:", error);
        throw new Error("Validation failed. Please check the email settings.");
    }
});
exports.validateEmailSettings = validateEmailSettings;
/**
 * Valida las configuraciones de IMAP y SMTP almacenadas para un usuario.
 */
const validateUserEmailSettings = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield UserModel_1.default.findById(userId).select("emailSettings");
        if (!user || !user.emailSettings) {
            throw new Error("Email settings not found for user.");
        }
        const { imapSettings, smtpSettings, emailAddress } = user.emailSettings;
        if (!imapSettings || !smtpSettings || !emailAddress) {
            throw new Error("Incomplete email settings. IMAP, SMTP, and emailAddress are required.");
        }
        return (0, exports.validateEmailSettings)({ emailAddress, imapSettings, smtpSettings });
    }
    catch (error) {
        console.error("Error validating user email settings:", error);
        throw new Error("Validation failed. Please check the stored email settings.");
    }
});
exports.validateUserEmailSettings = validateUserEmailSettings;
/**
 * Escucha nuevos correos para usuarios con configuraciones válidas.
 */
const listenForNewEmails = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield UserModel_1.default.find({
            "emailSettings.imapSettings": { $exists: true },
        });
        for (const user of users) {
            const { _id: userId, emailSettings } = user;
            if (activeConnections.has(userId.toString())) {
                console.log(`Connection already exists for user: ${userId}`);
                continue;
            }
            const connection = yield imap_simple_1.default.connect({
                imap: Object.assign(Object.assign({}, emailSettings.imapSettings), { authTimeout: 10000 }),
            });
            yield connection.openBox("INBOX");
            connection.on("mail", (numNewMessages) => __awaiter(void 0, void 0, void 0, function* () {
                const results = yield connection.search(["UNSEEN"], {
                    bodies: [""],
                    struct: true,
                });
                for (const result of results) {
                    yield processEmailResult(result, userId.toString());
                }
            }));
            connection.on("error", (err) => {
                console.error(`IMAP connection error (user: ${userId}):`, err);
                activeConnections.delete(userId.toString());
            });
            connection.on("close", () => {
                console.warn(`IMAP connection closed (user: ${userId}).`);
                activeConnections.delete(userId.toString());
            });
            activeConnections.set(userId.toString(), connection);
        }
    }
    catch (error) {
        console.error("Error setting up email listeners:", error);
    }
});
exports.listenForNewEmails = listenForNewEmails;
/**
 * Procesa y guarda el resultado de un correo en la base de datos.
 */
const processEmailResult = (result, userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Extraer el cuerpo completo del correo
        const rawEmail = (_b = (_a = result.parts) === null || _a === void 0 ? void 0 : _a.find((part) => part.which === "")) === null || _b === void 0 ? void 0 : _b.body;
        if (!rawEmail) {
            console.warn("No raw email part found.", { result });
            return null;
        }
        // Parsear el correo con simpleParser
        const parsedMail = yield (0, mailparser_1.simpleParser)(rawEmail);
        // Validar campos esenciales
        const { uid } = result.attributes || {};
        if (!parsedMail.from || !parsedMail.to || !parsedMail.subject || !uid) {
            console.error("Missing essential fields in email:", { parsedMail });
            return null;
        }
        // Verificar si el correo ya existe en la base de datos
        const existingEmail = yield EmailModel_1.default.findOne({ uid, userId });
        if (existingEmail) {
            console.log(`Email with UID ${uid} already exists. Skipping.`);
            return null;
        }
        // Procesar adjuntos: guardar solo los metadatos
        const attachments = parsedMail.attachments.map((attachment) => ({
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size, // Tamaño en bytes
            partID: attachment.cid || attachment.contentId || "", // Identificador único de la parte
        }));
        // Crear objeto de correo para guardar en la base de datos
        const email = {
            date: parsedMail.date,
            from: parsedMail.from.text,
            to: Array.isArray(parsedMail.to)
                ? parsedMail.to.map((addr) => addr.text)
                : [parsedMail.to.text],
            subject: parsedMail.subject || "",
            userId,
            html: parsedMail.html || "",
            text: parsedMail.text || "",
            uid,
            attachments, // Incluir metadatos de los adjuntos
        };
        // Guardar el correo en la base de datos
        yield EmailModel_1.default.create(email);
        console.log(`Email saved successfully: ${parsedMail.subject}`);
        return email;
    }
    catch (error) {
        console.error("Error processing email:", error);
        return null;
    }
});
/**
 * Cierra todas las conexiones activas al apagar el servidor.
 */
const closeAllConnections = () => __awaiter(void 0, void 0, void 0, function* () {
    for (const [userId, connection] of activeConnections.entries()) {
        try {
            yield connection.end();
            activeConnections.delete(userId);
        }
        catch (error) {
            console.error(`Error closing connection for user: ${userId}`, error);
        }
    }
});
exports.closeAllConnections = closeAllConnections;
/**
 * Sincroniza correos antiguos desde el servidor IMAP.
 */
const syncOldEmails = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield UserModel_1.default.findOne({ _id: userId }).select("emailSettings");
        if (!((_a = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _a === void 0 ? void 0 : _a.imapSettings)) {
            throw new Error("IMAP settings not found for user.");
        }
        const connection = yield imap_simple_1.default.connect({
            imap: Object.assign(Object.assign({}, user.emailSettings.imapSettings), { authTimeout: 10000 }),
        });
        yield connection.openBox("INBOX");
        const results = yield connection.search([["BEFORE", new Date().toUTCString().slice(0, 16)]], { bodies: [""], struct: true });
        const processedEmails = yield Promise.all(results.map((result) => processEmailResult(result, userId)));
        yield connection.end();
        return processedEmails.filter((email) => email !== null);
    }
    catch (error) {
        console.error("Error syncing old emails:", error);
        throw error;
    }
});
exports.syncOldEmails = syncOldEmails;
/**
 * Elimina un correo electrónico del servidor IMAP.
 * @param userId ID del usuario propietario del correo.
 * @param uid UID del correo a eliminar.
 * @returns Mensaje de confirmación.
 */
const deleteEmailFromServer = (userId, uid) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Obtener configuraciones del usuario
        const user = yield UserModel_1.default.findOne({ _id: userId }).select("emailSettings");
        if (!((_a = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _a === void 0 ? void 0 : _a.imapSettings)) {
            throw new Error("IMAP settings not found for user.");
        }
        // Conectar al servidor IMAP
        const connection = yield imap_simple_1.default.connect({
            imap: Object.assign(Object.assign({}, user.emailSettings.imapSettings), { authTimeout: 10000 }),
        });
        yield connection.openBox("INBOX");
        // Eliminar el correo
        yield connection.deleteMessage(uid);
        yield connection.end();
        return `Email with UID ${uid} deleted successfully from IMAP server.`;
    }
    catch (error) {
        console.error("Error deleting email from server:", error);
        throw new Error("Failed to delete email from server.");
    }
});
exports.deleteEmailFromServer = deleteEmailFromServer;
