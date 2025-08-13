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
const socket_1 = require("../config/socket");
const activeConnections = new Map();
const MAX_RECONNECT_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 30000; // 30 segundos
const HEALTH_CHECK_INTERVAL = 60000; // 1 minuto
/**
 * Gestión mejorada de conexiones IMAP con reconexión automática
 */
class IMAPConnectionManager {
    static getInstance() {
        if (!IMAPConnectionManager.instance) {
            IMAPConnectionManager.instance = new IMAPConnectionManager();
        }
        return IMAPConnectionManager.instance;
    }
    /**
     * Inicia el monitoreo de salud de conexiones
     */
    startHealthCheck() {
        this.healthCheckTimer = setInterval(() => {
            this.checkConnectionsHealth();
        }, HEALTH_CHECK_INTERVAL);
    }
    /**
     * Verifica la salud de todas las conexiones activas
     */
    checkConnectionsHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [userId, manager] of activeConnections.entries()) {
                try {
                    // Verificar si la conexión está activa
                    if (manager.connection &&
                        manager.connection.state === "authenticated") {
                        yield manager.connection.openBox("INBOX");
                        manager.isHealthy = true;
                        manager.lastActivity = new Date();
                    }
                    else {
                        manager.isHealthy = false;
                        yield this.reconnectUser(userId);
                    }
                }
                catch (error) {
                    console.error(`Health check failed for user ${userId}:`, error);
                    manager.isHealthy = false;
                    yield this.reconnectUser(userId);
                }
            }
        });
    }
    /**
     * Reconecta un usuario específico
     */
    reconnectUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const manager = activeConnections.get(userId);
            if (!manager || manager.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.error(`Max reconnection attempts reached for user ${userId}`);
                activeConnections.delete(userId);
                return;
            }
            try {
                manager.reconnectAttempts++;
                console.log(`Attempting reconnection ${manager.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} for user ${userId}`);
                // Cerrar conexión existente si existe
                if (manager.connection) {
                    try {
                        yield manager.connection.end();
                    }
                    catch (error) {
                        console.warn(`Error closing existing connection for user ${userId}:`, error);
                    }
                }
                // Establecer nueva conexión
                yield this.createConnectionForUser(userId);
            }
            catch (error) {
                console.error(`Reconnection failed for user ${userId}:`, error);
                if (manager.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    activeConnections.delete(userId);
                }
            }
        });
    }
    /**
     * Crea una nueva conexión para un usuario
     */
    createConnectionForUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield UserModel_1.default.findById(userId).select("emailSettings");
            if (!((_a = user === null || user === void 0 ? void 0 : user.emailSettings) === null || _a === void 0 ? void 0 : _a.imapSettings)) {
                throw new Error(`Email settings not found for user ${userId}`);
            }
            // Validar que las configuraciones estén completas
            if (!isEmailConfigurationComplete(user.emailSettings)) {
                throw new Error(`Incomplete email configuration for user ${userId}`);
            }
            const connection = yield imap_simple_1.default.connect({
                imap: Object.assign(Object.assign({}, user.emailSettings.imapSettings), { authTimeout: CONNECTION_TIMEOUT, connTimeout: CONNECTION_TIMEOUT }),
            });
            yield connection.openBox("INBOX");
            // Configurar listeners
            connection.on("mail", (numNewMessages) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const results = yield connection.search(["UNSEEN"], {
                        bodies: [""],
                        struct: true,
                    });
                    for (const result of results) {
                        yield processEmailResult(result, userId);
                    }
                    // Actualizar actividad
                    const manager = activeConnections.get(userId);
                    if (manager) {
                        manager.lastActivity = new Date();
                    }
                }
                catch (error) {
                    console.error(`Error processing new emails for user ${userId}:`, error);
                }
            }));
            connection.on("error", (err) => {
                console.error(`IMAP connection error (user: ${userId}):`, err);
                const manager = activeConnections.get(userId);
                if (manager) {
                    manager.isHealthy = false;
                }
            });
            connection.on("close", () => {
                console.warn(`IMAP connection closed (user: ${userId}).`);
                const manager = activeConnections.get(userId);
                if (manager) {
                    manager.isHealthy = false;
                }
            });
            // Actualizar o crear manager
            const manager = activeConnections.get(userId) || {
                connection: null,
                lastActivity: new Date(),
                reconnectAttempts: 0,
                isHealthy: true,
            };
            manager.connection = connection;
            manager.isHealthy = true;
            manager.reconnectAttempts = 0;
            manager.lastActivity = new Date();
            activeConnections.set(userId, manager);
        });
    }
    /**
     * Detiene el monitoreo de salud
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
    }
}
/**
 * Valida las configuraciones de IMAP y SMTP proporcionadas.
 */
const validateEmailSettings = (_a) => __awaiter(void 0, [_a], void 0, function* ({ emailAddress, imapSettings, smtpSettings, }) {
    var _b;
    try {
        // Validar conexión IMAP con timeout
        const imapValidation = yield Promise.race([
            imap_simple_1.default
                .connect({
                imap: Object.assign(Object.assign({}, imapSettings), { tls: (_b = imapSettings.tls) !== null && _b !== void 0 ? _b : true, authTimeout: 10000, connTimeout: 10000 }),
            })
                .then((connection) => __awaiter(void 0, void 0, void 0, function* () {
                yield connection.openBox("INBOX");
                yield connection.end();
                return { status: "success", message: "IMAP connection successful." };
            })),
            new Promise((_, reject) => setTimeout(() => reject(new Error("IMAP connection timeout")), 15000)),
        ]).catch((error) => ({
            status: "error",
            message: error.message.includes("timeout")
                ? "IMAP connection timed out."
                : "IMAP authentication failed.",
        }));
        // Validar conexión SMTP con timeout
        const smtpValidation = yield Promise.race([
            new Promise((resolve) => {
                const transporter = nodemailer_1.default.createTransport({
                    host: smtpSettings.host,
                    port: smtpSettings.port,
                    secure: smtpSettings.secure,
                    auth: { user: smtpSettings.user, pass: smtpSettings.password },
                    connectionTimeout: 10000,
                });
                transporter
                    .verify()
                    .then(() => resolve({
                    status: "success",
                    message: "SMTP connection successful.",
                }))
                    .catch((error) => resolve({
                    status: "error",
                    message: error.message.includes("timeout")
                        ? "SMTP connection timed out."
                        : "SMTP authentication failed.",
                }));
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("SMTP validation timeout")), 15000)),
        ]).catch(() => ({
            status: "error",
            message: "SMTP validation timed out.",
        }));
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
 * Valida si las configuraciones de email están completas y no son strings vacíos
 */
const isEmailConfigurationComplete = (emailSettings) => {
    if (!emailSettings)
        return false;
    const { emailAddress, imapSettings, smtpSettings } = emailSettings;
    // Validar que emailAddress no esté vacío
    if (!emailAddress || emailAddress.trim() === "")
        return false;
    // Validar configuraciones IMAP
    if (!imapSettings)
        return false;
    if (!imapSettings.host || imapSettings.host.trim() === "")
        return false;
    if (!imapSettings.user || imapSettings.user.trim() === "")
        return false;
    if (!imapSettings.password || imapSettings.password.trim() === "")
        return false;
    if (!imapSettings.port || imapSettings.port <= 0)
        return false;
    // Validar configuraciones SMTP
    if (!smtpSettings)
        return false;
    if (!smtpSettings.host || smtpSettings.host.trim() === "")
        return false;
    if (!smtpSettings.user || smtpSettings.user.trim() === "")
        return false;
    if (!smtpSettings.password || smtpSettings.password.trim() === "")
        return false;
    if (!smtpSettings.port || smtpSettings.port <= 0)
        return false;
    return true;
};
/**
 * Escucha nuevos correos para usuarios con configuraciones válidas.
 */
const listenForNewEmails = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connectionManager = IMAPConnectionManager.getInstance();
        connectionManager.startHealthCheck();
        // Buscar usuarios que tengan configuraciones de email
        const users = yield UserModel_1.default.find({
            "emailSettings.imapSettings": { $exists: true },
        }).select("emailSettings");
        console.log(`📧 Evaluando ${users.length} usuarios para conexiones IMAP...`);
        let validUsers = 0;
        let invalidUsers = 0;
        for (const user of users) {
            const { _id: userId } = user;
            // Validar que las configuraciones estén completas
            if (!isEmailConfigurationComplete(user.emailSettings)) {
                console.log(`⚠️ Usuario ${userId} tiene configuraciones incompletas, omitiendo...`);
                invalidUsers++;
                continue;
            }
            if (activeConnections.has(userId.toString())) {
                console.log(`🔄 Conexión ya existe para usuario: ${userId}`);
                continue;
            }
            try {
                yield connectionManager.createConnectionForUser(userId.toString());
                validUsers++;
                console.log(`✅ Conexión IMAP establecida para usuario: ${userId}`);
            }
            catch (error) {
                console.error(`❌ Error creando conexión para usuario ${userId}:`, error);
                invalidUsers++;
            }
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    try {
        // Extraer el cuerpo completo del correo
        const rawEmail = (_b = (_a = result.parts) === null || _a === void 0 ? void 0 : _a.find((part) => part.which === "")) === null || _b === void 0 ? void 0 : _b.body;
        if (!rawEmail) {
            console.warn("⚠️ No raw email part found.", {
                resultKeys: Object.keys(result || {}),
                partsLength: ((_c = result.parts) === null || _c === void 0 ? void 0 : _c.length) || 0,
            });
            return null;
        }
        // Parsear el correo con simpleParser
        const parsedMail = yield (0, mailparser_1.simpleParser)(rawEmail);
        // Validar campos esenciales
        const { uid } = result.attributes || {};
        if (!parsedMail.from || !parsedMail.to || !parsedMail.subject || !uid) {
            console.error("❌ Missing essential fields in email:", {
                hasFrom: !!parsedMail.from,
                hasTo: !!parsedMail.to,
                hasSubject: !!parsedMail.subject,
                hasUid: !!uid,
                subject: parsedMail.subject,
                from: parsedMail.from,
                to: parsedMail.to,
            });
            return null;
        }
        // Generar messageId si no existe
        const messageId = parsedMail.messageId ||
            ((_d = parsedMail.headers) === null || _d === void 0 ? void 0 : _d.get("message-id")) ||
            `${uid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${userId}`;
        // Verificar si el correo ya existe en la base de datos
        const existingEmail = yield EmailModel_1.default.findOne({
            $or: [
                { uid, userId },
                { messageId, userId },
            ],
        });
        if (existingEmail) {
            return null;
        }
        // Procesar adjuntos: guardar solo los metadatos
        const attachments = ((_e = parsedMail.attachments) === null || _e === void 0 ? void 0 : _e.map((attachment, index) => ({
            filename: attachment.filename || `attachment_${index}`,
            contentType: attachment.contentType || "application/octet-stream",
            size: attachment.size || 0,
            partID: attachment.cid ||
                attachment.contentId ||
                `${uid}-${Date.now()}-${index}`,
        }))) || [];
        // Procesar direcciones de email con mejor manejo de errores
        let fromAddress;
        try {
            fromAddress =
                typeof parsedMail.from === "string"
                    ? parsedMail.from
                    : ((_f = parsedMail.from) === null || _f === void 0 ? void 0 : _f.text) ||
                        ((_j = (_h = (_g = parsedMail.from) === null || _g === void 0 ? void 0 : _g.value) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.address) ||
                        "unknown@unknown.com";
        }
        catch (error) {
            console.warn("⚠️ Error processing from address:", error);
            fromAddress = "unknown@unknown.com";
        }
        let toAddresses;
        try {
            toAddresses = Array.isArray(parsedMail.to)
                ? parsedMail.to.map((addr) => {
                    var _a, _b;
                    return typeof addr === "string"
                        ? addr
                        : addr.text || ((_b = (_a = addr.value) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.address) || "unknown@unknown.com";
                })
                : [
                    typeof parsedMail.to === "string"
                        ? parsedMail.to
                        : ((_k = parsedMail.to) === null || _k === void 0 ? void 0 : _k.text) ||
                            ((_o = (_m = (_l = parsedMail.to) === null || _l === void 0 ? void 0 : _l.value) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.address) ||
                            "unknown@unknown.com",
                ];
        }
        catch (error) {
            console.warn("⚠️ Error processing to addresses:", error);
            toAddresses = ["unknown@unknown.com"];
        }
        let ccAddresses;
        try {
            ccAddresses = parsedMail.cc
                ? Array.isArray(parsedMail.cc)
                    ? parsedMail.cc.map((addr) => {
                        var _a, _b;
                        return typeof addr === "string"
                            ? addr
                            : addr.text || ((_b = (_a = addr.value) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.address) || "unknown@unknown.com";
                    })
                    : [
                        typeof parsedMail.cc === "string"
                            ? parsedMail.cc
                            : ((_p = parsedMail.cc) === null || _p === void 0 ? void 0 : _p.text) ||
                                ((_s = (_r = (_q = parsedMail.cc) === null || _q === void 0 ? void 0 : _q.value) === null || _r === void 0 ? void 0 : _r[0]) === null || _s === void 0 ? void 0 : _s.address) ||
                                "unknown@unknown.com",
                    ]
                : [];
        }
        catch (error) {
            console.warn("⚠️ Error processing cc addresses:", error);
            ccAddresses = [];
        }
        let bccAddresses;
        try {
            bccAddresses = parsedMail.bcc
                ? Array.isArray(parsedMail.bcc)
                    ? parsedMail.bcc.map((addr) => {
                        var _a, _b;
                        return typeof addr === "string"
                            ? addr
                            : addr.text || ((_b = (_a = addr.value) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.address) || "unknown@unknown.com";
                    })
                    : [
                        typeof parsedMail.bcc === "string"
                            ? parsedMail.bcc
                            : ((_t = parsedMail.bcc) === null || _t === void 0 ? void 0 : _t.text) ||
                                ((_w = (_v = (_u = parsedMail.bcc) === null || _u === void 0 ? void 0 : _u.value) === null || _v === void 0 ? void 0 : _v[0]) === null || _w === void 0 ? void 0 : _w.address) ||
                                "unknown@unknown.com",
                    ]
                : [];
        }
        catch (error) {
            console.warn("⚠️ Error processing bcc addresses:", error);
            bccAddresses = [];
        }
        // Crear objeto de correo para guardar en la base de datos
        const email = {
            date: parsedMail.date || new Date(),
            from: fromAddress,
            to: toAddresses,
            cc: ccAddresses,
            bcc: bccAddresses,
            subject: parsedMail.subject || "Sin asunto",
            userId,
            html: parsedMail.html || "",
            text: parsedMail.text || "",
            uid,
            messageId,
            attachments,
            folder: "INBOX",
            isRead: false,
            isStarred: false,
            isImportant: false,
            labels: [],
            priority: "normal",
            flags: [],
            hasAttachments: attachments.length > 0,
            isEncrypted: false,
            size: rawEmail.length || 0,
            snippet: ((_x = parsedMail.text) === null || _x === void 0 ? void 0 : _x.substring(0, 200)) ||
                (parsedMail.html
                    ? parsedMail.html.replace(/<[^>]*>/g, "").substring(0, 200)
                    : "") ||
                "",
            threadId: parsedMail.inReplyTo || undefined,
            inReplyTo: parsedMail.inReplyTo || undefined,
        };
        // Guardar el correo en la base de datos
        const savedEmail = yield EmailModel_1.default.create(email);
        // Emitir evento de socket para notificar nuevo correo
        try {
            (0, socket_1.emitToUser)(userId, "newEmail", {
                email: savedEmail,
                message: "Nuevo correo recibido",
            });
        }
        catch (socketError) {
            console.error(`📡 ❌ Failed to emit socket event:`, socketError);
        }
        return savedEmail;
    }
    catch (error) {
        console.error("❌ Error processing email:", {
            error: (error === null || error === void 0 ? void 0 : error.message) || "Unknown error",
            stack: error === null || error === void 0 ? void 0 : error.stack,
            userId,
            uid: (_y = result.attributes) === null || _y === void 0 ? void 0 : _y.uid,
            resultKeys: Object.keys(result || {}),
        });
        return null;
    }
});
/**
 * Cierra todas las conexiones activas al apagar el servidor.
 */
const closeAllConnections = () => __awaiter(void 0, void 0, void 0, function* () {
    const connectionManager = IMAPConnectionManager.getInstance();
    connectionManager.stopHealthCheck();
    for (const [userId, manager] of activeConnections.entries()) {
        try {
            if (manager.connection) {
                yield manager.connection.end();
            }
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
