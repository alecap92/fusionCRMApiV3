"use strict";
/**
 * Configuración centralizada para el sistema de correos electrónicos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailConfigUtils = exports.EmailConfigValidator = exports.defaultEmailConfig = void 0;
exports.defaultEmailConfig = {
    imap: {
        connectionTimeout: 30000, // 30 segundos
        authTimeout: 10000, // 10 segundos
        maxReconnectAttempts: 3,
        healthCheckInterval: 60000, // 1 minuto
        idleTimeout: 300000, // 5 minutos
    },
    smtp: {
        connectionTimeout: 10000, // 10 segundos
        socketTimeout: 10000, // 10 segundos
        maxConnections: 5,
        rateDelta: 1000, // 1 segundo
        rateLimit: 5, // 5 correos por segundo
    },
    processing: {
        batchSize: 50,
        maxConcurrentProcessing: 10,
        retryAttempts: 3,
        retryDelay: 5000, // 5 segundos
    },
    storage: {
        maxAttachmentSize: 25 * 1024 * 1024, // 25 MB
        allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "text/csv",
        ],
        compressionEnabled: true,
    },
    security: {
        encryptPasswords: true,
        tokenExpiration: 3600000, // 1 hora
        maxLoginAttempts: 5,
    },
};
/**
 * Validador de configuración de correo
 */
class EmailConfigValidator {
    static validateImapSettings(settings) {
        const errors = [];
        if (!settings.host || typeof settings.host !== "string") {
            errors.push("IMAP host is required and must be a string");
        }
        if (!settings.port ||
            typeof settings.port !== "number" ||
            settings.port < 1 ||
            settings.port > 65535) {
            errors.push("IMAP port must be a valid number between 1 and 65535");
        }
        if (!settings.user || typeof settings.user !== "string") {
            errors.push("IMAP user is required and must be a string");
        }
        if (!settings.password || typeof settings.password !== "string") {
            errors.push("IMAP password is required and must be a string");
        }
        if (settings.tls !== undefined && typeof settings.tls !== "boolean") {
            errors.push("IMAP tls must be a boolean");
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    static validateSmtpSettings(settings) {
        const errors = [];
        if (!settings.host || typeof settings.host !== "string") {
            errors.push("SMTP host is required and must be a string");
        }
        if (!settings.port ||
            typeof settings.port !== "number" ||
            settings.port < 1 ||
            settings.port > 65535) {
            errors.push("SMTP port must be a valid number between 1 and 65535");
        }
        if (!settings.user || typeof settings.user !== "string") {
            errors.push("SMTP user is required and must be a string");
        }
        if (!settings.password || typeof settings.password !== "string") {
            errors.push("SMTP password is required and must be a string");
        }
        if (settings.secure !== undefined && typeof settings.secure !== "boolean") {
            errors.push("SMTP secure must be a boolean");
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    static validateEmailAddress(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
exports.EmailConfigValidator = EmailConfigValidator;
/**
 * Utilidades para configuración de correo
 */
class EmailConfigUtils {
    /**
     * Detecta automáticamente configuraciones IMAP/SMTP basadas en el dominio del email
     */
    static autoDetectSettings(emailAddress) {
        var _a;
        const domain = (_a = emailAddress.split("@")[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        const commonProviders = {
            "gmail.com": {
                imap: { host: "imap.gmail.com", port: 993, tls: true },
                smtp: { host: "smtp.gmail.com", port: 587, secure: false },
            },
            "outlook.com": {
                imap: { host: "outlook.office365.com", port: 993, tls: true },
                smtp: { host: "smtp-mail.outlook.com", port: 587, secure: false },
            },
            "hotmail.com": {
                imap: { host: "outlook.office365.com", port: 993, tls: true },
                smtp: { host: "smtp-mail.outlook.com", port: 587, secure: false },
            },
            "yahoo.com": {
                imap: { host: "imap.mail.yahoo.com", port: 993, tls: true },
                smtp: { host: "smtp.mail.yahoo.com", port: 587, secure: false },
            },
            "icloud.com": {
                imap: { host: "imap.mail.me.com", port: 993, tls: true },
                smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
            },
        };
        return commonProviders[domain] || null;
    }
    /**
     * Genera configuración segura por defecto
     */
    static generateSecureDefaults(baseSettings) {
        return Object.assign(Object.assign({}, baseSettings), { authTimeout: exports.defaultEmailConfig.imap.authTimeout, connectionTimeout: exports.defaultEmailConfig.imap.connectionTimeout, tls: true, tlsOptions: {
                rejectUnauthorized: false, // Para certificados auto-firmados
                servername: baseSettings.host,
            } });
    }
}
exports.EmailConfigUtils = EmailConfigUtils;
exports.default = exports.defaultEmailConfig;
