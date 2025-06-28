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
exports.verifySession = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const OrganizationModel_1 = __importDefault(require("../models/OrganizationModel"));
dotenv_1.default.config();
const secretKey = process.env.SECRET_KEY;
// Función para generar un token JWT
const generateToken = (user, rememberMe = false) => {
    const payload = {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        organizationId: user.organizationId,
        rememberMe,
        role: user.role || "",
        iat: Math.floor(Date.now() / 1000), // Añadir timestamp de emisión
    };
    // Ajustar la expiración según "rememberMe"
    // Si rememberMe es true: 30 días
    // Si rememberMe es false: 24 horas
    const expiresIn = rememberMe ? "30d" : "24h";
    const token = jsonwebtoken_1.default.sign(payload, secretKey, { expiresIn });
    return token;
};
exports.generateToken = generateToken;
// Middleware para verificar el token JWT
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.status(401).json({ message: "Token no proporcionado" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Formato de token incorrecto" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secretKey);
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
                message: "Sesión cerrada globalmente",
                code: "GLOBAL_LOGOUT",
            });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        console.log("error en verifyToken", error);
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expirado" });
        }
        else if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Token no válido" });
        }
        console.error("Error verifying token: ", error.message);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});
exports.verifyToken = verifyToken;
// Middleware para verificar y extraer información del token JWT (similar a verifyToken, si lo quieres separado)
const verifySession = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.status(401).json({ message: "Token no proporcionado" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Formato de token incorrecto" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secretKey);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error("Error verifying session:", error);
        res.status(401).json({ message: "Token no válido" });
    }
};
exports.verifySession = verifySession;
