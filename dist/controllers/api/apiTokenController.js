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
exports.renewApiToken = exports.getApiPermissions = exports.revokeApiToken = exports.listApiTokens = exports.createApiToken = void 0;
const apiTypes_1 = require("../../types/apiTypes");
const authApiMiddleware_1 = require("../../middlewares/authApiMiddleware");
const ApiTokenModel_1 = __importDefault(require("../../models/ApiTokenModel"));
// Crear un nuevo token de API
const createApiToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { name, permissions, expiresIn = "365d", description, } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        if (!userId || !organizationId) {
            return res.status(401).json({
                message: "Usuario no autenticado",
                code: "USER_NOT_AUTHENTICATED",
            });
        }
        // Validaciones básicas
        if (!name || !permissions || permissions.length === 0) {
            return res.status(400).json({
                message: "Nombre y permisos son requeridos",
                code: "MISSING_REQUIRED_FIELDS",
            });
        }
        // Validar que los permisos son válidos
        const validPermissions = Object.values(apiTypes_1.API_PERMISSIONS);
        const invalidPermissions = permissions.filter((p) => !validPermissions.includes(p));
        if (invalidPermissions.length > 0) {
            return res.status(400).json({
                message: "Permisos inválidos",
                code: "INVALID_PERMISSIONS",
                invalidPermissions,
            });
        }
        // Verificar si ya existe un token con el mismo nombre para este usuario
        const existingToken = yield ApiTokenModel_1.default.findOne({
            userId,
            organizationId,
            name,
            isActive: true,
        });
        if (existingToken) {
            return res.status(400).json({
                message: "Ya existe un token activo con ese nombre",
                code: "TOKEN_NAME_EXISTS",
            });
        }
        // Generar el token JWT
        const token = (0, authApiMiddleware_1.generateApiToken)({
            _id: userId,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            organizationId,
        }, name, expiresIn);
        // Calcular fecha de expiración
        let expiresAt = null;
        if (expiresIn !== "never") {
            const duration = parseDuration(expiresIn);
            if (duration) {
                expiresAt = new Date(Date.now() + duration);
            }
        }
        // Guardar el token en la base de datos
        const apiToken = new ApiTokenModel_1.default({
            userId,
            organizationId,
            name,
            description,
            tokenHash: token, // En producción, considera usar hash del token
            permissions,
            isActive: true,
            expiresAt,
            createdBy: userId,
        });
        yield apiToken.save();
        const response = {
            token,
            tokenId: apiToken._id.toString(),
            name: apiToken.name,
            permissions: apiToken.permissions,
            expiresAt: apiToken.expiresAt || null,
            createdAt: apiToken.createdAt,
        };
        res.status(201).json({
            message: "Token de API creado exitosamente",
            data: response,
            warning: "Guarde este token de forma segura. No podrá verlo nuevamente.",
        });
    }
    catch (error) {
        console.error("Error creating API token:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
});
exports.createApiToken = createApiToken;
// Listar tokens de API del usuario
const listApiTokens = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        if (!userId || !organizationId) {
            return res.status(401).json({
                message: "Usuario no autenticado",
                code: "USER_NOT_AUTHENTICATED",
            });
        }
        const tokens = yield ApiTokenModel_1.default.find({
            userId,
            organizationId,
        })
            .sort({ createdAt: -1 })
            .select("-tokenHash"); // Excluir el hash del token
        res.json({
            message: "Tokens de API obtenidos exitosamente",
            data: tokens,
            count: tokens.length,
        });
    }
    catch (error) {
        console.error("Error listing API tokens:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
});
exports.listApiTokens = listApiTokens;
// Revocar/desactivar un token de API
const revokeApiToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { tokenId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        if (!userId || !organizationId) {
            return res.status(401).json({
                message: "Usuario no autenticado",
                code: "USER_NOT_AUTHENTICATED",
            });
        }
        const token = yield ApiTokenModel_1.default.findOne({
            _id: tokenId,
            userId,
            organizationId,
        });
        if (!token) {
            return res.status(404).json({
                message: "Token no encontrado",
                code: "TOKEN_NOT_FOUND",
            });
        }
        yield token.deactivate();
        res.json({
            message: "Token de API revocado exitosamente",
            data: { tokenId: token._id },
        });
    }
    catch (error) {
        console.error("Error revoking API token:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
});
exports.revokeApiToken = revokeApiToken;
// Obtener permisos disponibles y grupos predefinidos
const getApiPermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            message: "Permisos de API obtenidos exitosamente",
            data: {
                permissions: apiTypes_1.API_PERMISSIONS,
                groups: apiTypes_1.PERMISSION_GROUPS,
            },
        });
    }
    catch (error) {
        console.error("Error getting API permissions:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
});
exports.getApiPermissions = getApiPermissions;
// Renovar un token de API (crear uno nuevo y desactivar el anterior)
const renewApiToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { tokenId } = req.params;
        const { expiresIn = "365d" } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        if (!userId || !organizationId) {
            return res.status(401).json({
                message: "Usuario no autenticado",
                code: "USER_NOT_AUTHENTICATED",
            });
        }
        const oldToken = yield ApiTokenModel_1.default.findOne({
            _id: tokenId,
            userId,
            organizationId,
            isActive: true,
        });
        if (!oldToken) {
            return res.status(404).json({
                message: "Token no encontrado o inactivo",
                code: "TOKEN_NOT_FOUND",
            });
        }
        // Crear nuevo token con la misma configuración
        const newToken = (0, authApiMiddleware_1.generateApiToken)({
            _id: userId,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            organizationId,
        }, oldToken.name, expiresIn);
        // Calcular nueva fecha de expiración
        let expiresAt = null;
        if (expiresIn !== "never") {
            const duration = parseDuration(expiresIn);
            if (duration) {
                expiresAt = new Date(Date.now() + duration);
            }
        }
        // Crear nuevo registro de token
        const newApiToken = new ApiTokenModel_1.default({
            userId,
            organizationId,
            name: oldToken.name,
            description: oldToken.description,
            tokenHash: newToken,
            permissions: oldToken.permissions,
            isActive: true,
            expiresAt,
            createdBy: userId,
        });
        yield newApiToken.save();
        // Desactivar el token anterior
        yield oldToken.deactivate();
        const response = {
            token: newToken,
            tokenId: newApiToken._id.toString(),
            name: newApiToken.name,
            permissions: newApiToken.permissions,
            expiresAt: newApiToken.expiresAt || null,
            createdAt: newApiToken.createdAt,
        };
        res.json({
            message: "Token de API renovado exitosamente",
            data: response,
            warning: "Guarde este nuevo token de forma segura. El token anterior ha sido revocado.",
        });
    }
    catch (error) {
        console.error("Error renewing API token:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
});
exports.renewApiToken = renewApiToken;
// Función helper para parsear duración
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match)
        return null;
    const [, value, unit] = match;
    const num = parseInt(value, 10);
    switch (unit) {
        case "m":
            return num * 60 * 1000; // minutos
        case "h":
            return num * 60 * 60 * 1000; // horas
        case "d":
            return num * 24 * 60 * 60 * 1000; // días
        default:
            return null;
    }
}
