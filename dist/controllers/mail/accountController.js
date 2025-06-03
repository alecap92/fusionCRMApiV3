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
exports.getAccountSettings = exports.validateAccount = exports.configureAccount = void 0;
const UserModel_1 = __importDefault(require("../../models/UserModel"));
const imapClient_1 = require("../../utils/imapClient");
/**
 * Configura la cuenta IMAP/SMTP para el usuario autenticado.
 */
const configureAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { emailAddress, imapSettings, smtpSettings } = req.body;
        if (!emailAddress || !imapSettings || !smtpSettings) {
            return res.status(400).json({
                error: "Email address, IMAP, and SMTP settings are required.",
            });
        }
        // Validar configuraciones antes de guardar
        const validationResults = yield (0, imapClient_1.validateEmailSettings)({
            emailAddress,
            imapSettings,
            smtpSettings,
        });
        if (validationResults.imap.status === "error" ||
            validationResults.smtp.status === "error") {
            return res.status(400).json({
                message: "Validation failed.",
                validationResults,
            });
        }
        // Guardar configuraciones en la base de datos
        const user = yield UserModel_1.default.findByIdAndUpdate(userId, {
            emailSettings: {
                emailAddress,
                imapSettings,
                smtpSettings,
            },
        }, { new: true });
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        // Sincronizar correos antiguos
        const syncedEmails = yield (0, imapClient_1.syncOldEmails)(userId);
        res.status(200).json({
            message: "Account configured and emails synchronized successfully.",
            validationResults,
            syncedEmailsCount: syncedEmails.length,
        });
    }
    catch (error) {
        console.error("Error configuring account:", error.message || error);
        res.status(500).json({ error: "Failed to configure account." });
    }
});
exports.configureAccount = configureAccount;
/**
 * Valida la configuración IMAP/SMTP proporcionada.
 */
/**
 * Valida las configuraciones IMAP y SMTP del usuario.
 */
const validateAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Llamar a la función de validación centralizada
        const validationResults = yield (0, imapClient_1.validateUserEmailSettings)(userId);
        res.status(200).json(Object.assign({ message: "Validation completed." }, validationResults));
    }
    catch (error) {
        console.error("Error validating account:", error.message || error);
        res.status(500).json({ error: "Failed to validate account settings." });
    }
});
exports.validateAccount = validateAccount;
/**
 * Obtiene la configuración de email del usuario autenticado.
 */
const getAccountSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = yield UserModel_1.default.findById(userId).select("emailSettings");
        if (!user || !user.emailSettings) {
            return res.status(404).json({
                message: "No email settings found for this user.",
                emailSettings: null,
            });
        }
        // Retornar configuraciones sin las contraseñas por seguridad
        const safeSettings = {
            emailAddress: user.emailSettings.emailAddress,
            imapSettings: {
                host: user.emailSettings.imapSettings.host,
                port: user.emailSettings.imapSettings.port,
                user: user.emailSettings.imapSettings.user,
                tls: user.emailSettings.imapSettings.tls,
                lastUID: user.emailSettings.imapSettings.lastUID,
                // password omitida por seguridad
            },
            smtpSettings: {
                host: user.emailSettings.smtpSettings.host,
                port: user.emailSettings.smtpSettings.port,
                user: user.emailSettings.smtpSettings.user,
                secure: user.emailSettings.smtpSettings.secure,
                // password omitida por seguridad
            },
        };
        res.status(200).json(safeSettings);
    }
    catch (error) {
        console.error("Error getting account settings:", error.message || error);
        res.status(500).json({ error: "Failed to get account settings." });
    }
});
exports.getAccountSettings = getAccountSettings;
