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
exports.requireApiPermission = exports.verifyApiToken = exports.generateApiToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const OrganizationModel_1 = __importDefault(require("../models/OrganizationModel"));
const ApiTokenModel_1 = __importDefault(require("../models/ApiTokenModel"));
dotenv_1.default.config();
const apiSecretKey = process.env.API_SECRET_KEY;
if (!apiSecretKey) {
    throw new Error("API_SECRET_KEY environment variable is required");
}
// Función para generar un token de API JWT
const generateApiToken = (user, tokenName, expiresIn = "365d" // Por defecto 1 año para tokens de API
) => {
    const payload = {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        tokenName,
        type: "api",
    };
    const token = jsonwebtoken_1.default.sign(payload, apiSecretKey);
    return token;
};
exports.generateApiToken = generateApiToken;
// Middleware para verificar tokens de API JWT
const verifyApiToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.header("Authorization") || req.header("X-API-Key");
    if (!authHeader) {
        return res.status(401).json({
            message: "Token de API no proporcionado",
            code: "API_TOKEN_MISSING",
            details: "Proporcione el token en el header 'Authorization: Bearer <token>' o 'X-API-Key: <token>'",
        });
    }
    // Soportar tanto "Bearer token" como token directo
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;
    if (!token) {
        return res.status(401).json({
            message: "Formato de token de API incorrecto",
            code: "API_TOKEN_FORMAT_ERROR",
        });
    }
    try {
        // Verificar el token JWT
        const decoded = jsonwebtoken_1.default.verify(token, apiSecretKey);
        // Verificar que es un token de tipo API
        if (decoded.type !== "api") {
            return res.status(401).json({
                message: "Token no válido para API",
                code: "INVALID_API_TOKEN_TYPE",
            });
        }
        // Verificar si el token existe en la base de datos y está activo
        const apiTokenRecord = yield ApiTokenModel_1.default.findOne({
            tokenHash: token, // Usaremos el hash del token para búsqueda
            userId: decoded._id,
            isActive: true,
        });
        if (!apiTokenRecord) {
            return res.status(401).json({
                message: "Token de API no encontrado o inactivo",
                code: "API_TOKEN_NOT_FOUND",
            });
        }
        // Verificar si el usuario existe y sigue activo
        const user = yield UserModel_1.default.findById(decoded._id);
        if (!user) {
            return res.status(401).json({
                message: "Usuario no encontrado",
                code: "USER_NOT_FOUND",
            });
        }
        // Verificar si el usuario sigue siendo parte de la organización
        const organization = yield OrganizationModel_1.default.findById(decoded.organizationId);
        if (!organization ||
            !organization.employees.includes(user._id.toString())) {
            return res.status(401).json({
                message: "Usuario no pertenece a la organización",
                code: "USER_NOT_IN_ORGANIZATION",
            });
        }
        // Verificar si el token fue emitido antes del último logout global
        if (user.lastLogoutAt &&
            decoded.iat &&
            decoded.iat * 1000 < user.lastLogoutAt.getTime()) {
            return res.status(401).json({
                message: "Token invalidado por logout global",
                code: "GLOBAL_LOGOUT",
            });
        }
        // Actualizar último uso del token
        yield ApiTokenModel_1.default.findByIdAndUpdate(apiTokenRecord._id, {
            lastUsedAt: new Date(),
        });
        // Agregar información del usuario y organización a la request
        req.apiUser = {
            _id: decoded._id,
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            organizationId: decoded.organizationId,
            tokenName: decoded.tokenName,
        };
        req.apiToken = {
            id: apiTokenRecord._id.toString(),
            name: apiTokenRecord.name,
            permissions: apiTokenRecord.permissions,
        };
        next();
    }
    catch (error) {
        console.log("Error en verifyApiToken", error);
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Token de API expirado",
                code: "API_TOKEN_EXPIRED",
            });
        }
        else if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                message: "Token de API no válido",
                code: "API_TOKEN_INVALID",
            });
        }
        console.error("Error verifying API token: ", error.message);
        return res.status(500).json({
            message: "Error interno del servidor",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
});
exports.verifyApiToken = verifyApiToken;
// Middleware para verificar permisos específicos del token de API
const requireApiPermission = (permission) => {
    return (req, res, next) => {
        if (!req.apiToken) {
            return res.status(401).json({
                message: "Token de API no verificado",
                code: "API_TOKEN_NOT_VERIFIED",
            });
        }
        const hasPermission = req.apiToken.permissions.includes(permission) ||
            req.apiToken.permissions.includes("*");
        if (!hasPermission) {
            return res.status(403).json({
                message: `Permiso insuficiente. Se requiere: ${permission}`,
                code: "INSUFFICIENT_API_PERMISSIONS",
                requiredPermission: permission,
                availablePermissions: req.apiToken.permissions,
            });
        }
        next();
    };
};
exports.requireApiPermission = requireApiPermission;
