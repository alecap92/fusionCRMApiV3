"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateN8nWebhook = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware de autenticación simplificado para webhooks de n8n
 * Solo valida que se proporcione un organization ID válido
 */
const validateN8nWebhook = (req, res, next) => {
    try {
        // Obtener organization ID del header
        const organizationId = req.headers["x-organization-id"];
        // Validar que esté presente
        if (!organizationId) {
            logger_1.default.warn("[N8N_AUTH] Organization ID no proporcionado", {
                headers: Object.keys(req.headers),
                ip: req.ip,
                userAgent: req.get("User-Agent"),
            });
            return res.status(400).json({
                success: false,
                message: "Organization ID requerido. Use el header 'x-organization-id'",
            });
        }
        // Validar formato del organization ID (debe ser un ObjectId válido de MongoDB)
        if (!organizationId.match(/^[0-9a-fA-F]{24}$/)) {
            logger_1.default.warn("[N8N_AUTH] Organization ID con formato inválido", {
                organizationId,
                ip: req.ip,
            });
            return res.status(400).json({
                success: false,
                message: "Organization ID debe ser un ObjectId válido de MongoDB (24 caracteres hexadecimales)",
            });
        }
        // Adjuntar información al request para uso posterior
        req.organizationId = organizationId;
        req.isN8nRequest = true;
        logger_1.default.info("[N8N_AUTH] Autenticación exitosa", {
            organizationId,
            ip: req.ip,
            endpoint: req.originalUrl,
        });
        next();
    }
    catch (error) {
        logger_1.default.error("[N8N_AUTH] Error en middleware de autenticación", {
            error: error instanceof Error ? error.message : "Error desconocido",
            ip: req.ip,
        });
        return res.status(500).json({
            success: false,
            message: "Error interno en autenticación",
        });
    }
};
exports.validateN8nWebhook = validateN8nWebhook;
